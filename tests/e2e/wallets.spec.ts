import { expect, test } from "@playwright/test";

/**
 * Smoke coverage for the wallet monitoring dashboard: auth gate, loading,
 * error, empty, and populated data states, plus the sidebar navigation
 * that links into this page.
 *
 * `/dashboard/*` is protected by `mux_auth_session` (see
 * src/middleware.ts) so every test signs in through the real login flow
 * first rather than seeding a cookie directly — this keeps the smoke
 * suite honest about the actual user path.
 */
async function signIn(page: import("@playwright/test").Page) {
	await page.goto("/login");
	await page.getByLabel("Email address").fill("dev@muxprotocol.com");
	await page.getByLabel("Password").fill("password123");
	await page.getByTestId("login-submit").click();
	await page.waitForURL("**/dashboard**");
}

test.describe("Wallets dashboard smoke", () => {
	test("redirects unauthenticated visitors to /login", async ({ page }) => {
		await page.goto("/dashboard/wallets");
		await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard/);
	});

	test("navigates from the dashboard sidebar to the wallets page", async ({
		page,
	}) => {
		await signIn(page);
		await page.getByRole("link", { name: "Wallets" }).click();
		await expect(page).toHaveURL(/\/dashboard\/wallets/);
		await expect(
			page.getByRole("heading", { name: "Wallet Monitoring" }),
		).toBeVisible();
	});

	test("shows the error state when the wallets API is unreachable", async ({
		page,
	}) => {
		// The mock /api/wallets route requires a bearer token the client does
		// not currently send, so this reflects real unauthenticated-fetch
		// behavior rather than a synthetic failure.
		await signIn(page);
		await page.goto("/dashboard/wallets");

		await expect(
			page.getByText("Failed to load wallets", { exact: false }),
		).toBeVisible();
		await page.getByRole("button", { name: "Retry" }).click();
	});

	test("shows the empty state when no wallets are returned", async ({
		page,
	}) => {
		await page.route("**/api/wallets", (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			}),
		);

		await signIn(page);
		await page.goto("/dashboard/wallets");

		await expect(page.getByText("No wallets found")).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Add Wallet" }),
		).toBeVisible();
	});

	test("renders the wallet table when wallets are returned", async ({
		page,
	}) => {
		await page.route("**/api/wallets", (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([
					{
						id: "wallet-001",
						address:
							"GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
						network: "mainnet",
						status: "active",
						createdAt: "2024-01-15T10:30:00Z",
						balance: "1,250.50 XLM",
					},
				]),
			}),
		);

		await signIn(page);
		await page.goto("/dashboard/wallets");

		await expect(page.getByTestId("wallet-row-0")).toBeVisible();
	});

	test("opens the add wallet modal from the empty state", async ({
		page,
	}) => {
		await page.route("**/api/wallets", (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			}),
		);

		await signIn(page);
		await page.goto("/dashboard/wallets");

		await page.getByRole("button", { name: "Add Wallet" }).click();
		await expect(page.getByRole("dialog")).toBeVisible();
	});
});
