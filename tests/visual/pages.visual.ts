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
