/**
 * Regression tests for readCookie in src/lib/csrf.ts (issue #1166).
 *
 * Documented contract: reads a cookie value verbatim (no percent-decoding).
 * Returns null when the cookie is absent or empty. Decoding is intentionally
 * skipped so the CSRF comparison is symmetric with the raw header token.
 */
import { describe, expect, it } from "vitest";
import { readCookie } from "../csrf";

describe("readCookie", () => {
	it("returns the value verbatim for a matching cookie", () => {
		expect(readCookie("csrf_token=abc123", "csrf_token")).toBe("abc123");
	});

	it("returns null when the cookie header is null", () => {
		expect(readCookie(null, "csrf_token")).toBeNull();
	});

	it("returns null when the cookie header is undefined", () => {
		expect(readCookie(undefined, "csrf_token")).toBeNull();
	});

	it("returns null when the cookie header is an empty string", () => {
		expect(readCookie("", "csrf_token")).toBeNull();
	});

	it("returns null when the named cookie is absent", () => {
		expect(readCookie("mux_session=s; other=1", "csrf_token")).toBeNull();
	});

	it("returns null when the named cookie is present but has no value", () => {
		expect(readCookie("csrf_token=", "csrf_token")).toBeNull();
	});

	// Verbatim/no-decoding contract: a percent-encoded value must be returned
	// as-is, not decoded. If this returns "abc-def" the symmetry guarantee
	// breaks and the test must fail.
	it("does NOT percent-decode the value — returns the raw encoded string", () => {
		const encoded = "abc%2Ddef";
		expect(readCookie(`csrf_token=${encoded}`, "csrf_token")).toBe(encoded);
		expect(readCookie(`csrf_token=${encoded}`, "csrf_token")).not.toBe("abc-def");
	});

	it("picks the correct cookie when multiple are present", () => {
		expect(
			readCookie("mux_session=s; csrf_token=tok42; other=1", "csrf_token"),
		).toBe("tok42");
	});

	it("handles a value that contains an equals sign", () => {
		expect(readCookie("csrf_token=a=b=c", "csrf_token")).toBe("a=b=c");
	});

	it("is case-sensitive: does not match a differently-cased name", () => {
		expect(readCookie("CSRF_TOKEN=abc", "csrf_token")).toBeNull();
	});
});
