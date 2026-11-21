/**
 * Regression tests for the SAFE_METHODS Set in src/lib/csrf.ts (issue #1165).
 *
 * Documented contract (module-level comment): the client must echo a
 * non-HttpOnly CSRF token cookie in the x-csrf-token header for any
 * state-changing request. The double-submit comparison uses the raw,
 * undecoded cookie value. Normalization rule: neither side is
 * percent-decoded, so a cookie/header pair that differs only by
 * URL-encoding is rejected symmetrically.
 *
 * The Set of safe methods (GET, HEAD, OPTIONS) is the gate between requests
 * that require a CSRF token and those that do not. If a method is wrongly
 * classified as safe the double-submit check is bypassed silently.
 */
import { describe, expect, it } from "vitest";
import { tryWithCsrf, withCsrf } from "../csrf";

/** CookieSource stub with a csrf_token present. */
const src = (cookie: string) => ({ cookie });
const WITH_TOKEN = src("csrf_token=tok42");
const NO_TOKEN = src("mux_session=s");
const EMPTY_TOKEN = src("csrf_token=");

// ---------------------------------------------------------------------------
// Safe methods — no CSRF header should be attached
// ---------------------------------------------------------------------------
describe("SAFE_METHODS set (GET / HEAD / OPTIONS)", () => {
	it.each(["GET", "HEAD", "OPTIONS"])(
		"does not attach x-csrf-token for safe method %s",
		(method) => {
			const result = withCsrf({ method }, WITH_TOKEN);
			expect(new Headers(result.headers).get("x-csrf-token")).toBeNull();
		},
	);

	it.each(["get", "head", "options"])(
		"safe-method check is case-insensitive (%s)",
		(method) => {
			const result = withCsrf({ method }, WITH_TOKEN);
			expect(new Headers(result.headers).get("x-csrf-token")).toBeNull();
		},
	);

	it("treats a request with no method as safe (defaults to GET)", () => {
		const result = withCsrf({}, WITH_TOKEN);
		expect(new Headers(result.headers).get("x-csrf-token")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Unsafe methods — CSRF header must be attached
// ---------------------------------------------------------------------------
describe("unsafe methods require the CSRF token", () => {
	it.each(["POST", "PUT", "PATCH", "DELETE"])(
		"attaches x-csrf-token for unsafe method %s",
		(method) => {
			const result = withCsrf({ method }, WITH_TOKEN);
			expect(new Headers(result.headers).get("x-csrf-token")).toBe("tok42");
		},
	);

	it("attaches same-origin credentials alongside the token", () => {
		const result = withCsrf({ method: "POST" }, WITH_TOKEN);
		expect(result.credentials).toBe("same-origin");
	});

	it("preserves an explicitly supplied credentials mode", () => {
		const result = withCsrf(
			{ method: "POST", credentials: "include" },
			WITH_TOKEN,
		);
		expect(result.credentials).toBe("include");
	});

	it("returns the original init unchanged when no token is present", () => {
		const init: RequestInit = { method: "POST", body: "{}" };
		expect(withCsrf(init, NO_TOKEN)).toBe(init);
		expect(withCsrf(init, EMPTY_TOKEN)).toBe(init);
	});
});

// ---------------------------------------------------------------------------
// tryWithCsrf — reports whether attachment succeeded
// ---------------------------------------------------------------------------
describe("tryWithCsrf ok flag", () => {
	it("reports ok:true for a safe method even without a token", () => {
		const { ok } = tryWithCsrf({ method: "GET" }, NO_TOKEN);
		expect(ok).toBe(true);
	});

	it("reports ok:false for an unsafe method when no token is present", () => {
		const { ok, init } = tryWithCsrf({ method: "POST" }, NO_TOKEN);
		expect(ok).toBe(false);
		expect(init).toMatchObject({ method: "POST" });
	});

	it("reports ok:true and sets the header for an unsafe method with a token", () => {
		const { ok, init } = tryWithCsrf({ method: "DELETE" }, WITH_TOKEN);
		expect(ok).toBe(true);
		expect(new Headers(init.headers).get("x-csrf-token")).toBe("tok42");
	});
});
