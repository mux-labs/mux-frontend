import { expect, test } from "@playwright/test";

/**
 * Optional visual regression (issue #840).
 *
 * Only runs under the `visual` Playwright project, which is registered when
 * `VISUAL_REGRESSION=1`. It is never part of the `smoke` or `full` tiers, so
 * it cannot block PRs. Baselines live next to this file in
 * `pages.visual.ts-snapshots/`; regenerate them with:
 *
 *   VISUAL_REGRESSION=1 pnpm exec playwright test --project=visual --update-snapshots
 */
const PAGES = [{ name: "login", path: "/login" }];

for (const { name, path } of PAGES) {
	test(`${name} page matches baseline`, async ({ page }) => {
		await page.goto(path);
		await page.waitForLoadState("networkidle");
		await expect(page).toHaveScreenshot(`${name}.png`, {
			fullPage: true,
			animations: "disabled",
			maxDiffPixelRatio: 0.01,
		});
	});
}
