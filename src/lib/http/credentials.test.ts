// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readSessionCookie } from "./credentials";

function requestWithCookie(cookie?: string): Request {
	const headers: Record<string, string> = {};
	if (cookie !== undefined) headers.cookie = cookie;
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
