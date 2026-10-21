import { describe, expect, it } from "vitest";
import {
	SESSION_COOKIE_NAME,
	credentialFingerprintSource,
	forwardCredentialHeaders,
	hasCredential,
	isCsrfSafe,
} from "./credentials";

const makeRequest = (
	method = "POST",
	headers: Record<string, string> = {},
	url = "http://localhost/api/transactions/send",
) => new Request(url, { method, headers });

describe("hasCredential", () => {
	it("returns false when no authorization, x-api-key, or session cookie is present", () => {
		expect(hasCredential(makeRequest())).toBe(false);
		expect(hasCredential(makeRequest("POST", { cookie: "other_cookie=123" }))).toBe(
			false,
		);
		expect(
			hasCredential(makeRequest("POST", { cookie: `${SESSION_COOKIE_NAME}=` })),
		).toBe(false);
		expect(
			hasCredential(makeRequest("POST", { authorization: "Basic dXNlcjpwYXNz" })),
		).toBe(false);
		expect(hasCredential(makeRequest("POST", { "x-api-key": "   " }))).toBe(false);
	});

	it("returns true when Bearer or ApiKey authorization header is present", () => {
		expect(
			hasCredential(makeRequest("POST", { authorization: "Bearer tok_123" })),
		).toBe(true);
		expect(
			hasCredential(makeRequest("POST", { authorization: "ApiKey key_123" })),
		).toBe(true);
	});

	it("returns true when x-api-key header is present", () => {
		expect(hasCredential(makeRequest("POST", { "x-api-key": "k_live_abc" }))).toBe(
			true,
		);
	});

	it("returns true when mux_session cookie is present", () => {
		expect(
			hasCredential(
				makeRequest("POST", {
					cookie: `theme=dark; ${SESSION_COOKIE_NAME}=sess_abc123`,
				}),
			),
		).toBe(true);
	});
});

describe("isCsrfSafe", () => {
	it("allows requests carrying an explicit authorization or x-api-key header regardless of origin", () => {
		expect(
			isCsrfSafe(
				makeRequest("POST", {
					authorization: "Bearer tok_123",
					origin: "https://attacker.example",
				}),
			),
		).toBe(true);
		expect(
			isCsrfSafe(
				makeRequest("POST", {
					"x-api-key": "key_123",
				}),
			),
		).toBe(true);
	});

	it("allows cookie-authenticated requests whose Origin matches the request URL origin", () => {
		expect(
			isCsrfSafe(
				makeRequest("POST", {
					cookie: `${SESSION_COOKIE_NAME}=sess_1`,
					origin: "http://localhost",
				}),
			),
		).toBe(true);
	});

	it("rejects cookie-only requests with missing or mismatched Origin header", () => {
		expect(
			isCsrfSafe(
				makeRequest("POST", {
					cookie: `${SESSION_COOKIE_NAME}=sess_1`,
				}),
			),
		).toBe(false);
		expect(
			isCsrfSafe(
				makeRequest("POST", {
					cookie: `${SESSION_COOKIE_NAME}=sess_1`,
					origin: "https://evil.example",
				}),
			),
		).toBe(false);
	});
});

describe("forwardCredentialHeaders", () => {
	it("forwards only authorization, x-api-key, and normalized mux_session cookie", () => {
		const req = makeRequest("POST", {
			authorization: "Bearer tok_1",
			"x-api-key": "key_1",
			cookie: `unrelated=foo; ${SESSION_COOKIE_NAME}=sess_val`,
			"x-custom": "ignored",
		});
		expect(forwardCredentialHeaders(req)).toEqual({
			authorization: "Bearer tok_1",
			"x-api-key": "key_1",
			cookie: `${SESSION_COOKIE_NAME}=sess_val`,
		});
	});

	it("omits cookie header when mux_session is not present", () => {
		const req = makeRequest("POST", {
			"x-api-key": "key_1",
			cookie: "unrelated=foo; mux_csrf=bar",
		});
		const forwarded = forwardCredentialHeaders(req);
		expect(forwarded).toEqual({ "x-api-key": "key_1" });
		expect(forwarded.cookie).toBeUndefined();
	});
});

describe("credentialFingerprintSource", () => {
	it("returns authorization, x-api-key, session cookie, or empty string in priority order", () => {
		expect(
			credentialFingerprintSource(
				makeRequest("POST", {
					authorization: "Bearer tok",
					"x-api-key": "key",
				}),
			),
		).toBe("Bearer tok");
		expect(
			credentialFingerprintSource(makeRequest("POST", { "x-api-key": "key" })),
		).toBe("key");
		expect(
			credentialFingerprintSource(
				makeRequest("POST", { cookie: `${SESSION_COOKIE_NAME}=s1` }),
			),
		).toBe("s1");
		expect(credentialFingerprintSource(makeRequest())).toBe("");
	});
});
