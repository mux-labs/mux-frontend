import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Mux Dashboard end-to-end smoke tests.
 *
 * Smoke specs live in `tests/e2e/` and exercise the primary user paths
 * (login, wallet monitoring) against a locally running dev server. The
 * mock `/api/auth/login` and `/api/wallets` routes accept any well-formed
 * request when `NEXT_PUBLIC_API_URL` is unset, so these tests run the same
 * way in CI, testnet, and mainnet-configured environments.
 *
 * Run with:
 *   pnpm exec playwright install --with-deps chromium
 *   pnpm run test:e2e
 */
export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
	timeout: 30_000,
	expect: {
		timeout: 5_000,
	},
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	webServer: {
		command: "pnpm run dev",
		// Probes `/login` rather than `/` for readiness: `/` pulls in
		// `APIKeyModal.tsx`, which currently has a pre-existing compile
		// error unrelated to these specs, and would otherwise make the
		// webServer never come up. `/login` is a stable, always-compiling
		// route every spec already depends on.
		url: "http://localhost:3000/login",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		env: {
			NEXT_PUBLIC_API_URL: "",
		},
	},
	projects: [
		{
			name: "desktop-chromium",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			// Narrow mobile viewport coverage per the manual verification checklist
			// (see tests/e2e/README.md) — catches layout regressions on small screens.
			name: "mobile-chromium",
			use: { ...devices["Pixel 7"] },
		},
	],
});
