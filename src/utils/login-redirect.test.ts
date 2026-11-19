import { describe, expect, it } from "vitest";
import { DEFAULT_LOGIN_REDIRECT, getSafeLoginRedirect } from "./login-redirect";

describe("getSafeLoginRedirect", () => {
	it.each([
		"/dashboard",
		"/dashboard/analytics",
		"/dashboard/wallets?id=1#top",
		"/dashboard?tab=activity",
	])("allows %s", (input) => {
		expect(getSafeLoginRedirect(input)).toBe(input);
	});

	it.each([
		undefined,
		null,
		"",
		"https://evil.com/dashboard",
		"//evil.com/dashboard",
		"/\\evil.com",
		"%2F%2Fevil.com",
		"javascript:alert(1)",
		"/dashboardevil",
		"/login",
		"/dashboard\n",
		"%E0%A4%A",
		"/dashboard%3Fnext=%2F%2Fevil.com",
		"/dashboard#//evil.com",
		"/dashboard?next=//evil.com",
		"/dashboard?redirect=https://evil.com",
	])("rejects %s", (input) => {
		expect(getSafeLoginRedirect(input)).toBe(DEFAULT_LOGIN_REDIRECT);
	});

	it("falls back to DEFAULT_LOGIN_REDIRECT for non-string input", () => {
		expect(getSafeLoginRedirect(42 as unknown as string)).toBe(
			DEFAULT_LOGIN_REDIRECT,
		);
	});

	it("rejects control characters embedded in an otherwise allowed path", () => {
		expect(getSafeLoginRedirect("/dashboard\u0000")).toBe(
			DEFAULT_LOGIN_REDIRECT,
		);
		expect(getSafeLoginRedirect("/dashboard\r\nSet-Cookie: x")).toBe(
			DEFAULT_LOGIN_REDIRECT,
		);
	});

	it("rejects backslash-smuggled protocol-relative targets", () => {
		expect(getSafeLoginRedirect("/\\/evil.com")).toBe(DEFAULT_LOGIN_REDIRECT);
		expect(getSafeLoginRedirect("\\\\evil.com")).toBe(DEFAULT_LOGIN_REDIRECT);
	});

	it("rejects query/fragment values that smuggle a second path", () => {
		expect(getSafeLoginRedirect("/dashboard?next=/login")).toBe(
			DEFAULT_LOGIN_REDIRECT,
		);
		expect(getSafeLoginRedirect("/dashboard#/login")).toBe(
			DEFAULT_LOGIN_REDIRECT,
		);
	});

	it("accepts an allowlisted prefix with a trailing slash", () => {
		expect(getSafeLoginRedirect("/dashboard/")).toBe("/dashboard/");
	});
});
