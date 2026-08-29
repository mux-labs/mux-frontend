import { expect, test } from "@playwright/test";
import { readRealBackendEnv, REAL_BACKEND_SKIP_REASON } from "./helpers";

/**
 * Contract coverage for POST /api/auth/login against a REAL mux-backend.
 *
 * tests/e2e/login.spec.ts's "signs in successfully" case fills in
 * "dev@muxprotocol.com" / "password123" and asserts a redirect — that only
 * works because the mock `/api/auth/login` route accepts *any*
 * well-formed credentials when NEXT_PUBLIC_API_URL is unset (see that
 * route's mock-fallback branch). Pointed at a real backend, those same
 * hardcoded credentials would just be rejected: the mock suite would give
 * false confidence rather than a meaningful pass/fail. This spec never
 * stubs `**\/api/auth/login` and never asserts the mock credentials work;
 * it uses credentials supplied out-of-band via env vars.
 *
 * Run via playwright.real-backend.config.ts — see ./README.md.
 */
const realBackend = readRealBackendEnv();

test.describe("Login against a real mux-backend", () => {
	test.skip(!realBackend, REAL_BACKEND_SKIP_REASON);

	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
	});

	test("rejects invalid credentials without redirecting to the dashboard", async ({
		page,
	}) => {
		await page
			.getByLabel("Email address")
			.fill("not-a-real-account@example.com");
		await page.getByLabel("Password").fill("definitely-wrong-password");
		await page.getByTestId("login-submit").click();

		await expect(page.getByTestId("login-error")).toBeVisible();
		await expect(page).not.toHaveURL(/\/dashboard/);
	});

	test("signs in with real backend credentials and redirects to the dashboard", async ({
		page,
	}) => {
		await page.getByLabel("Email address").fill(realBackend!.email);
		await page.getByLabel("Password").fill(realBackend!.password);
		await page.getByTestId("login-submit").click();

		await page.waitForURL("**/dashboard**");
		await expect(page).toHaveURL(/\/dashboard/);
	});
});
