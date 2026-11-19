// @vitest-environment node
import { describe, expect, it } from "vitest";
import { clientIp, readSessionCookie } from "./credentials";

function requestWithCookie(cookie?: string): Request {
	const headers: Record<string, string> = {};
	if (cookie !== undefined) headers.cookie = cookie;
	return new Request("http://localhost:3000/api/activity", { headers });
}

function requestWithHeaders(headers: Record<string, string>): Request {
	return new Request("http://localhost:3000/api/activity", { headers });
}

describe("readSessionCookie", () => {
	it("returns the session cookie value when present", () => {
		const request = requestWithCookie("session=abc123; other=xyz");
		expect(readSessionCookie(request)).toBe("abc123");
	});

	it("returns null when the session cookie is absent (deny-by-default)", () => {
		expect(readSessionCookie(requestWithCookie("other=xyz"))).toBeNull();
	});

	it("returns null when no cookie header is sent", () => {
		expect(readSessionCookie(requestWithCookie())).toBeNull();
	});

	it("returns null for an empty session cookie value", () => {
		expect(readSessionCookie(requestWithCookie("session="))).toBeNull();
	});
});

describe("clientIp", () => {
	it("returns the first x-forwarded-for entry when present", () => {
		const request = requestWithHeaders({
			"x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2",
		});
		expect(clientIp(request)).toBe("203.0.113.7");
	});

	it("prefers x-forwarded-for over x-real-ip", () => {
		const request = requestWithHeaders({
			"x-forwarded-for": "203.0.113.7",
			"x-real-ip": "198.51.100.9",
		});
		expect(clientIp(request)).toBe("203.0.113.7");
	});

	it("falls back to x-real-ip when x-forwarded-for is absent", () => {
		const request = requestWithHeaders({ "x-real-ip": "198.51.100.9" });
		expect(clientIp(request)).toBe("198.51.100.9");
	});

	it("returns null when neither header is present (direct connection)", () => {
		expect(clientIp(requestWithHeaders({}))).toBeNull();
	});
});
