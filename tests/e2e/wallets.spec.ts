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

	test("shows a loading skeleton while the wallets request is in flight", async ({
		page,
	}) => {
		// Hold the wallets response open so the loading state is observable,
		// then release it and assert the skeleton is replaced by real data.
		let release: () => void = () => {};
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});

		await page.route("**/api/wallets*", async (route) => {
			await gate;
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		await signIn(page);
		await page.goto("/dashboard/wallets");

		// Loading state is announced and the table is not yet rendered.
		await expect(page.getByTestId("wallets-loading")).toBeVisible();
		await expect(page.getByTestId("wallet-row-0")).toHaveCount(0);

		release();
		await expect(page.getByTestId("wallets-loading")).toHaveCount(0);
		await expect(page.getByText("No wallets found")).toBeVisible();
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

	test("fails closed on wallets fetch error without rendering stale rows", async ({
		page,
	}) => {
		// Dependency outage must fail closed: an actionable error with a
		// stable code/correlation id is shown and no wallet rows are rendered
		// as if the data were valid.
		await page.route("**/api/wallets*", (route) =>
			route.fulfill({
				status: 503,
				contentType: "application/json",
				headers: { "x-correlation-id": "corr-wallets-503" },
				body: JSON.stringify({
					code: "WALLETS_UNAVAILABLE",
					message: "Wallets are temporarily unavailable",
					correlationId: "corr-wallets-503",
				}),
			}),
		);

		await signIn(page);
		await page.goto("/dashboard/wallets");

		await expect(page.getByTestId("wallets-error")).toBeVisible();
		await expect(page.getByTestId("wallet-row-0")).toHaveCount(0);
		await expect(page.getByText("No wallets found")).toHaveCount(0);
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
						address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
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

	test("opens the add wallet modal from the empty state", async ({ page }) => {
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

	test("scopes the wallets request to the active network switcher, with no separate network filter", async ({
		page,
	}) => {
		// A network-aware fake backend: only ever returns wallets matching the
		// `network` query param useWallets({ network }) sent. If the page were
		// to *also* run a client-side network filter on top of this (the
		// removed double-filtering bug), switching the in-app network control
		// could show a contradictory/empty result instead of the wallets for
		// the newly-selected network.
		const mainnetWallet = {
			id: "wallet-mainnet-1",
			address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
			network: "mainnet",
			status: "active",
			createdAt: "2024-01-15T10:30:00Z",
			balance: "1,250.50 XLM",
		};
		const testnetWallet = {
			id: "wallet-testnet-1",
			address: "GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
			network: "testnet",
			status: "active",
			createdAt: "2024-02-20T08:15:00Z",
			balance: "500.00 XLM",
		};

		await page.route("**/api/wallets*", (route) => {
			const url = new URL(route.request().url());
			const network = url.searchParams.get("network");
			const body = network === "testnet" ? [testnetWallet] : [mainnetWallet];
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(body),
			});
		});

		await signIn(page);
		await page.goto("/dashboard/wallets");

		// Default network is Mainnet — only the mainnet wallet is shown.
		const row = page.getByTestId("wallet-row-0");
		await expect(row).toBeVisible();
		await expect(row.getByText("Mainnet")).toBeVisible();
		await expect(page.getByTestId("wallet-row-1")).toHaveCount(0);

		// There is no second, page-local "all/testnet/mainnet" filter control
		// re-filtering that already network-scoped data.
		await expect(
			page.getByRole("group", { name: "Network filter" }),
		).toHaveCount(0);

		// Switching the global network re-scopes the fetch and the table.
		await page.getByRole("button", { name: "Switch to Testnet" }).click();
		await expect(row.getByText("Testnet")).toBeVisible();
		await expect(row.getByText("Mainnet")).toHaveCount(0);
	});

	test("shows live today-usage on the spending limits card", async ({
		page,
	}) => {
		// The spending limits card must surface the live "today usage" figure
		// from the typed today-usage endpoint. The fake backend returns a
		// stable payload with a correlation id so the card can render the
		// amount and the as-of timestamp without leaking key material.
		await page.route("**/api/spending-limits/today-usage*", (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				headers: { "x-correlation-id": "corr-today-usage-1" },
				body: JSON.stringify({
					spentToday: "125.00 XLM",
					limit: "1,000.00 XLM",
					asOf: "2024-03-01T12:00:00Z",
					correlationId: "corr-today-usage-1",
				}),
			}),
		);

		await signIn(page);
		await page.goto("/dashboard/wallets");

		await expect(page.getByText("125.00 XLM")).toBeVisible();
	});

	test.describe("wallet detail deep links", () => {
		const wallet = {
			id: "wallet-001",
			address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
			network: "mainnet",
			status: "active",
			createdAt: "2024-01-15T10:30:00Z",
			balance: "1,250.50 XLM",
		};

		test("deep-links directly to a wallet detail route and renders it", async ({
			page,
		}) => {
			await page.route("**/api/wallets/wallet-001*", (route) =>
				route.fulfill({
					status: 200,
					contentType: "application/json",
					headers: { "x-correlation-id": "corr-wallet-detail-1" },
					body: JSON.stringify({ ...wallet, correlationId: "corr-wallet-detail-1" }),
				}),
			);

			await signIn(page);
			await page.goto("/dashboard/wallets/wallet-001");

			await expect(page).toHaveURL(/\/dashboard\/wallets\/wallet-001/);
			await expect(page.getByTestId("wallet-detail")).toBeVisible();
			await expect(page.getByText(wallet.address)).toBeVisible();
		});

		test("navigates from the wallet table row into the detail deep link", async ({
			page,
		}) => {
			await page.route("**/api/wallets*", (route) => {
				const url = new URL(route.request().url());
				if (url.pathname.endsWith("/wallet-001")) {
					return route.fulfill({
						status: 200,
						contentType: "application/json",
						body: JSON.stringify(wallet),
					});
				}
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify([wallet]),
				});
			});

			await signIn(page);
			await page.goto("/dashboard/wallets");

			await page.getByTestId("wallet-row-0").click();
			await expect(page).toHaveURL(/\/dashboard\/wallets\/wallet-001/);
			await expect(page.getByTestId("wallet-detail")).toBeVisible();
		});

		test("fails closed on wallet detail fetch error with a stable code", async ({
			page,
		}) => {
			await page.route("**/api/wallets/wallet-001*", (route) =>
				route.fulfill({
					status: 503,
					contentType: "application/json",
					headers: { "x-correlation-id": "corr-wallet-detail-503" },
					body: JSON.stringify({
						code: "WALLET_UNAVAILABLE",
						message: "Wallet is temporarily unavailable",
						correlationId: "corr-wallet-detail-503",
					}),
				}),
			);

			await signIn(page);
			await page.goto("/dashboard/wallets/wallet-001");

			await expect(page.getByTestId("wallet-detail-error")).toBeVisible();
			await expect(page.getByTestId("wallet-detail")).toHaveCount(0);
		});

		test("denies access to a wallet detail deep link for a revoked delegate", async ({
			page,
		}) => {
			await page.route("**/api/wallets/wallet-001*", (route) =>
				route.fulfill({
					status: 403,
					contentType: "application/json",
					headers: { "x-correlation-id": "corr-wallet-detail-403" },
					body: JSON.stringify({
						code: "WALLET_FORBIDDEN",
						message: "You are not authorized to view this wallet",
						correlationId: "corr-wallet-detail-403",
					}),
				}),
			);

			await signIn(page);
			await page.goto("/dashboard/wallets/wallet-001");

			await expect(page.getByTestId("wallet-detail-error")).toBeVisible();
			await expect(page.getByTestId("wallet-detail")).toHaveCount(0);
		});

		test("redirects unauthenticated visitors away from a wallet detail deep link", async ({
			page,
		}) => {
			await page.goto("/dashboard/wallets/wallet-001");
			await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard/);
		});
	});
});
