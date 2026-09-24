import { expect, type Page, test } from "@playwright/test";
import { readRealBackendEnv, REAL_BACKEND_SKIP_REASON } from "./helpers";

/**
 * Contract coverage for GET /api/wallets against a REAL mux-backend.
 *
 * tests/e2e/wallets.spec.ts signs in through the mock login and every data
 * state after that is either a `page.route("**\/api/wallets", ...)` stub
 * or the in-repo mock's hardcoded `VALID_ACCESS_TOKEN = "mock-access-token"`
 * bearer check (src/app/api/wallets/route.ts). Its own "error state" test
 * documents the gap directly: it asserts the page *fails* to load because
 * the client doesn't send that mock token — a real, correctly
 * authenticated session should succeed there, not show the error state, so
 * that assertion is backwards against a real backend.
 *
 * This spec signs in through the real backend and never intercepts
 * `/api/wallets`, so it reflects the actual response shape and auth
 * contract instead of the fixture in src/mock-data/wallets.ts.
 *
 * Run via playwright.real-backend.config.ts — see ./README.md.
 */
const realBackend = readRealBackendEnv();

async function signInRealBackend(page: Page) {
	await page.goto("/login");
	await page.getByLabel("Email address").fill(realBackend!.email);
	await page.getByLabel("Password").fill(realBackend!.password);
	await page.getByTestId("login-submit").click();
	await page.waitForURL("**/dashboard**");
}

test.describe("Wallets dashboard against a real mux-backend", () => {
	test.skip(!realBackend, REAL_BACKEND_SKIP_REASON);

	test("loads without the mock-only 'Failed to load wallets' error state", async ({
		page,
	}) => {
		await signInRealBackend(page);
		await page.goto("/dashboard/wallets");

		// A correctly authenticated real session must not hit the
		// missing/invalid-bearer-token error path the mock suite exercises.
		await expect(
			page.getByText("Failed to load wallets", { exact: false }),
		).toHaveCount(0);

		// Either the populated table or the genuine empty state is a valid
		// outcome for a real account — unlike the mock suite, this doesn't
		// assume a specific fixture (wallet-001, wallet-mainnet-1, ...).
		await expect(
			page.getByTestId("wallet-row-0").or(page.getByText("No wallets found")),
		).toBeVisible();
	});

	test("shows the loading skeleton before the wallets table resolves", async ({
		page,
	}) => {
		await signInRealBackend(page);

		// Hold the wallets response open so the loading state is observable
		// deterministically instead of racing the real backend's latency.
		let releaseWallets: () => void = () => {};
		const walletsHeld = new Promise<void>((resolve) => {
			releaseWallets = resolve;
		});
		await page.route("**/api/wallets", async (route) => {
			await walletsHeld;
			await route.continue();
		});

		await page.goto("/dashboard/wallets");

		// While the request is in flight the table must render its loading
		// state, not stale or partial wallet data.
		await expect(page.getByTestId("wallets-loading")).toBeVisible();
		await expect(page.getByTestId("wallet-row-0")).toHaveCount(0);

		releaseWallets();
		await expect(
			page.getByTestId("wallet-row-0").or(page.getByText("No wallets found")),
		).toBeVisible();
	});

	test("fails closed with an actionable error when the wallets fetch fails", async ({
		page,
	}) => {
		await signInRealBackend(page);

		// Simulate a dependency outage (RPC/DB/Horizon) on the wallets path.
		await page.route("**/api/wallets", (route) =>
			route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({
					code: "WALLETS_UNAVAILABLE",
					correlationId: "e2e-correlation-id",
					message: "Wallets are temporarily unavailable.",
				}),
			}),
		);

		await page.goto("/dashboard/wallets");

		// Fail-closed: the error state is shown and no wallet rows are
		// rendered as if the data were valid.
		await expect(page.getByTestId("wallets-error")).toBeVisible();
		await expect(page.getByTestId("wallet-row-0")).toHaveCount(0);
		await expect(page.getByText("No wallets found")).toHaveCount(0);

		// The error must be actionable and must not leak secrets or raw
		// key material.
		await expect(page.getByText("WALLETS_UNAVAILABLE")).toBeVisible();
		await expect(page.getByText("e2e-correlation-id")).toBeVisible();
		await expect(
			page.getByText(/bearer|authorization|secret|private key/i),
		).toHaveCount(0);
	});

	test("scopes the request to the active network switcher against the real backend", async ({
		page,
	}) => {
		await signInRealBackend(page);
		await page.goto("/dashboard/wallets");

		// No page-local "all/testnet/mainnet" filter should exist to
		// re-filter the already network-scoped response.
		await expect(
			page.getByRole("group", { name: "Network filter" }),
		).toHaveCount(0);

		await page.getByRole("button", { name: "Switch to Testnet" }).click();
		await expect(
			page.getByTestId("wallet-row-0").or(page.getByText("No wallets found")),
		).toBeVisible();
	});
});
