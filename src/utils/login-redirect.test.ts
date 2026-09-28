import { describe, expect, it } from "vitest";
import { DEFAULT_LOGIN_REDIRECT, getSafeLoginRedirect } from "./login-redirect";

describe("getSafeLoginRedirect", () => {
	it.each([
		"/dashboard",
		"/dashboard/analytics",
		"/dashboard/wallets?id=1#top",
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
	])("rejects %s", (input) => {
		expect(getSafeLoginRedirect(input)).toBe(DEFAULT_LOGIN_REDIRECT);
	});
});
