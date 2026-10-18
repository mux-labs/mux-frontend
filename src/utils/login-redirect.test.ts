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
});
