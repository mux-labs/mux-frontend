import { describe, expect, it } from "vitest";
import {
	CSRF_COOKIE_NAME,
	CSRF_HEADER_NAME,
	verifyCsrf,
	withCsrf,
} from "./csrf";

const req = (method: string, headers: Record<string, string> = {}) =>
	new Request("http://localhost/api/api-keys", { method, headers });

describe("verifyCsrf", () => {
	it("allows safe methods without a token", () => {
		expect(verifyCsrf(req("GET"))).toEqual({ ok: true });
	});

	it.each(["GET", "HEAD", "OPTIONS", "get", "head", "options"])(
		"allows safe method %s without a cookie or header",
		(method) => {
			expect(verifyCsrf(req(method))).toEqual({ ok: true });
		},
	);

	it("treats a request with no explicit method as a safe GET", () => {
		const r = new Request("http://localhost/api/api-keys");
		expect(verifyCsrf(r)).toEqual({ ok: true });
	});

	it("fails closed when token is missing on writes", () => {
		expect(verifyCsrf(req("POST"))).toEqual({
			ok: false,
			code: "CSRF_MISSING",
		});
		expect(verifyCsrf(req("POST", { cookie: "mux_csrf=abc" }))).toEqual({
			ok: false,
			code: "CSRF_MISSING",
		});
	});

	it.each(["POST", "PUT", "PATCH", "DELETE"])(
		"returns CSRF_MISSING for %s when the cookie is absent but the header is present",
		(method) => {
			const r = req(method, { [CSRF_HEADER_NAME]: "abc" });
			expect(verifyCsrf(r)).toEqual({ ok: false, code: "CSRF_MISSING" });
		},
	);

	it.each(["POST", "PUT", "PATCH", "DELETE"])(
		"returns CSRF_MISSING for %s when the header is absent but the cookie is present",
		(method) => {
			const r = req(method, { cookie: `${CSRF_COOKIE_NAME}=abc` });
			expect(verifyCsrf(r)).toEqual({ ok: false, code: "CSRF_MISSING" });
		},
	);

	it("returns CSRF_MISSING when only an unrelated cookie is present", () => {
		const r = req("POST", {
			cookie: "mux_session=s",
			[CSRF_HEADER_NAME]: "abc",
		});
		expect(verifyCsrf(r)).toEqual({ ok: false, code: "CSRF_MISSING" });
	});

	it("returns CSRF_MISSING when the CSRF cookie is present but empty", () => {
		const r = req("POST", {
			cookie: `${CSRF_COOKIE_NAME}=`,
			[CSRF_HEADER_NAME]: "abc",
		});
		expect(verifyCsrf(r)).toEqual({ ok: false, code: "CSRF_MISSING" });
	});

	it("rejects mismatched tokens", () => {
		const r = req("DELETE", {
			cookie: "mux_csrf=abc",
			[CSRF_HEADER_NAME]: "xyz",
		});
		expect(verifyCsrf(r)).toEqual({ ok: false, code: "CSRF_MISMATCH" });
	});

	it("rejects a same-length token that differs in a single character", () => {
		const r = req("POST", {
			cookie: `${CSRF_COOKIE_NAME}=token-abc123`,
			[CSRF_HEADER_NAME]: "token-abc124",
		});
		expect(verifyCsrf(r)).toEqual({ ok: false, code: "CSRF_MISMATCH" });
	});

	it("rejects a header token that is a prefix of the cookie token", () => {
		const r = req("POST", {
			cookie: `${CSRF_COOKIE_NAME}=abcdef`,
			[CSRF_HEADER_NAME]: "abc",
		});
		expect(verifyCsrf(r)).toEqual({ ok: false, code: "CSRF_MISMATCH" });
	});

	it("accepts matching tokens", () => {
		const r = req("POST", {
			cookie: "mux_session=s; mux_csrf=abc",
			[CSRF_HEADER_NAME]: "abc",
		});
		expect(verifyCsrf(r)).toEqual({ ok: true });
	});

	it.each(["PUT", "PATCH", "DELETE"])(
		"accepts matching tokens for %s",
		(method) => {
			const r = req(method, {
				cookie: `${CSRF_COOKIE_NAME}=abc`,
				[CSRF_HEADER_NAME]: "abc",
			});
			expect(verifyCsrf(r)).toEqual({ ok: true });
		},
	);
});

describe("withCsrf", () => {
	it("adds the header for unsafe methods only", () => {
		const post = withCsrf({ method: "POST" }, "mux_csrf=abc");
		expect(new Headers(post.headers).get(CSRF_HEADER_NAME)).toBe("abc");
		const get = withCsrf({ method: "GET" }, "mux_csrf=abc");
		expect(new Headers(get.headers).get(CSRF_HEADER_NAME)).toBeNull();
	});

	it.each(["GET", "HEAD", "OPTIONS"])(
		"returns the original init unchanged for safe method %s",
		(method) => {
			const init: RequestInit = { method, headers: { accept: "text/plain" } };
			expect(withCsrf(init, `${CSRF_COOKIE_NAME}=abc`)).toBe(init);
		},
	);

	it("returns the original init unchanged when no method is given (defaults to GET)", () => {
		const init: RequestInit = { headers: { accept: "text/plain" } };
		expect(withCsrf(init, `${CSRF_COOKIE_NAME}=abc`)).toBe(init);
	});

	it.each(["POST", "PUT", "PATCH", "DELETE"])(
		"attaches the token and same-origin credentials for %s",
		(method) => {
			const result = withCsrf(
				{ method, headers: { accept: "application/json" } },
				`mux_session=s; ${CSRF_COOKIE_NAME}=abc`,
			);
			const headers = new Headers(result.headers);
			expect(result.method).toBe(method);
			expect(headers.get(CSRF_HEADER_NAME)).toBe("abc");
			expect(headers.get("accept")).toBe("application/json");
			expect(result.credentials).toBe("same-origin");
		},
	);

	it("keeps an explicitly provided credentials mode", () => {
		const result = withCsrf(
			{ method: "POST", credentials: "include" },
			`${CSRF_COOKIE_NAME}=abc`,
		);
		expect(result.credentials).toBe("include");
	});

	it("decodes a URI-encoded cookie token before attaching it", () => {
		const result = withCsrf(
			{ method: "POST" },
			`${CSRF_COOKIE_NAME}=${encodeURIComponent("a+b/c=")}`,
		);
		expect(new Headers(result.headers).get(CSRF_HEADER_NAME)).toBe("a+b/c=");
	});

	it("returns the original init unchanged for an unsafe method when no token is present", () => {
		const init: RequestInit = { method: "POST", body: "{}" };
		expect(withCsrf(init, "")).toBe(init);
		expect(withCsrf(init, "mux_session=s; other=1")).toBe(init);
		expect(withCsrf(init, `${CSRF_COOKIE_NAME}=`)).toBe(init);
	});

	it("does not mutate the caller's init when attaching the token", () => {
		const init: RequestInit = { method: "POST" };
		const result = withCsrf(init, `${CSRF_COOKIE_NAME}=abc`);
		expect(result).not.toBe(init);
		expect(init.headers).toBeUndefined();
		expect(init.credentials).toBeUndefined();
	});
});
