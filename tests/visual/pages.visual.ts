import { expect, type Page, test } from "@playwright/test";

import { PAGES } from "./pages";

/**
 * Optional visual regression (issue #840; dashboard shell coverage added in
 * issue #946).
 *
 * Only runs under the `visual` Playwright project, which is registered when
 * `VISUAL_REGRESSION=1`. It is never part of the `smoke` or `full` tiers, so
 * it cannot block PRs. Baselines live next to this file in
 * `pages.visual.ts-snapshots/`; regenerate them with:
 *
 *   VISUAL_REGRESSION=1 pnpm exec playwright test --project=visual --update-snapshots
 */

// Mirrors the `signIn` helper in `tests/e2e/analytics.spec.ts`: with
// `NEXT_PUBLIC_API_URL` unset (the playwright dev-server env), `/api/auth/login`
// accepts any well-formed credentials and the dashboard shell falls back to
// mock data, so a real screenshot can be taken without a live backend.
async function signIn(page: Page) {
	await page.goto("/login");
	await page.getByLabel("Email address").fill("dev@muxprotocol.com");
	await page.getByLabel("Password").fill("password123");
	await page.getByTestId("login-submit").click();
	await page.waitForURL("**/dashboard**");
}

// Regression guard for the `signIn` contract documented above: with
// `NEXT_PUBLIC_API_URL` unset the mock login must accept well-formed
// credentials and land on the dashboard. If the mock stops doing that, the
// visual baselines would silently capture the login page instead of the
// dashboard shell, so this fails loudly instead.
test("signIn reaches the dashboard when NEXT_PUBLIC_API_URL is unset", async ({
	page,
}) => {
	await signIn(page);
	await expect(page).toHaveURL(/\/dashboard/);
});

// Failure path: the same helper must not report success when the login route
// rejects the credentials, so a broken mock cannot mask a regression.
test("signIn does not reach the dashboard when login is rejected", async ({
	page,
}) => {
	await page.route("**/api/auth/login", (route) =>
		route.fulfill({
			status: 401,
			contentType: "application/json",
			body: JSON.stringify({ error: "Invalid email or password." }),
		}),
	);

	await expect(signIn(page)).rejects.toThrow();
	await expect(page).not.toHaveURL(/\/dashboard/);
});

for (const { name, path, requiresAuth } of PAGES) {
	test(`${name} page matches baseline`, async ({ page }) => {
		if (requiresAuth) {
			await signIn(page);
		}
		await page.goto(path);
		await page.waitForLoadState("networkidle");
		await expect(page).toHaveScreenshot(`${name}.png`, {
			fullPage: true,
			animations: "disabled",
			maxDiffPixelRatio: 0.01,
		});
	});
}
