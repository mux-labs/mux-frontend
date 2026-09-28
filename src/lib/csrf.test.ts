import { describe, expect, it } from "vitest";
import { CSRF_HEADER_NAME, verifyCsrf, withCsrf } from "./csrf";

const req = (method: string, headers: Record<string, string> = {}) =>
	new Request("http://localhost/api/api-keys", { method, headers });

describe("verifyCsrf", () => {
	it("allows safe methods without a token", () => {
		expect(verifyCsrf(req("GET"))).toEqual({ ok: true });
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

	it("rejects mismatched tokens", () => {
		const r = req("DELETE", {
			cookie: "mux_csrf=abc",
			[CSRF_HEADER_NAME]: "xyz",
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
});

describe("withCsrf", () => {
	it("adds the header for unsafe methods only", () => {
		const post = withCsrf({ method: "POST" }, "mux_csrf=abc");
		expect(new Headers(post.headers).get(CSRF_HEADER_NAME)).toBe("abc");
		const get = withCsrf({ method: "GET" }, "mux_csrf=abc");
		expect(new Headers(get.headers).get(CSRF_HEADER_NAME)).toBeNull();
	});
});
