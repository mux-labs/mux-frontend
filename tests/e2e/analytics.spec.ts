import { expect, test } from "@playwright/test";

/**
 * Smoke coverage for the analytics dashboard export flow.
 *
 * `/dashboard/*` is protected by `mux_auth_session` (see src/middleware.ts)
 * so every test signs in through the real login flow first. With
 * `NEXT_PUBLIC_API_URL` unset (the playwright dev-server env), the analytics
 * page falls back to mock data: `useAnalyticsMetrics` loads the mock
 * metrics/charts, and `useAnalyticsTransactions` loads the mock export rows.
 *
 * What this spec guards: the CSV / JSON export buttons are rendered and, when
 * the page has real (mock-backed) transaction rows, clicking them triggers a
 * genuine file download. In a production build with no backend the export
 * would surface an error instead of silently succeeding — see
 * `src/docs/Analytics_Data_Sources.md`.
 */
async function signIn(page: import("@playwright/test").Page) {
	await page.goto("/login");
	await page.getByLabel("Email address").fill("dev@muxprotocol.com");
	await page.getByLabel("Password").fill("password123");
	await page.getByTestId("login-submit").click();
	await page.waitForURL("**/dashboard**");
}

test.describe("Analytics dashboard export smoke", () => {
	test("renders the analytics page with export controls once signed in", async ({
		page,
	}) => {
		await signIn(page);
		await page.goto("/dashboard/analytics");

		// The page loads mock-backed analytics data in this environment.
		await expect(
			page.getByRole("button", { name: /export.*csv/i }),
		).toBeEnabled();
		await expect(
			page.getByRole("button", { name: /export.*json/i }),
		).toBeEnabled();
	});

	test("downloads the transaction list as CSV", async ({ page }) => {
		await signIn(page);
		await page.goto("/dashboard/analytics");

		const exportButton = page.getByRole("button", { name: /export.*csv/i });
		await expect(exportButton).toBeEnabled();

		const downloadPromise = page.waitForEvent("download");
		await exportButton.click();
		const download = await downloadPromise;

		expect(download.suggestedFilename()).toMatch(/^analytics-.*\.csv$/);
	});

	test("downloads the transaction list as JSON", async ({ page }) => {
		await signIn(page);
		await page.goto("/dashboard/analytics");

		const exportButton = page.getByRole("button", { name: /export.*json/i });
		await expect(exportButton).toBeEnabled();

		const downloadPromise = page.waitForEvent("download");
		await exportButton.click();
		const download = await downloadPromise;

		expect(download.suggestedFilename()).toMatch(/^analytics-.*\.json$/);
	});
});
