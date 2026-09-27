import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Mux Dashboard end-to-end tests.
 *
 * Specs live in `tests/e2e/` and exercise the primary user paths
 * (login, wallet monitoring, send/receive) against a locally running dev
 * server. The mock `/api/auth/login` and `/api/wallets` routes accept any
 * well-formed request when `NEXT_PUBLIC_API_URL` is unset, so these tests
 * run the same way in CI, testnet, and mainnet-configured environments.
 *
 * Two project tiers are defined (see tests/e2e/README.md):
 *   - `smoke`: a curated subset of critical-path specs (login, wallets,
 *     wallet-send-receive) that must stay fast and green on every PR.
 *   - `full`: the entire `tests/e2e/` suite, run as a separate job.
 *
 * Run with:
 *   pnpm exec playwright install --with-deps chromium
 *   pnpm run test:e2e            # full suite
 *   pnpm run test:e2e:smoke      # smoke subset only
 */

// Critical-path specs that make up the smoke tier. Keep this list small and
// stable; the full tier runs everything under `testDir` regardless.
const SMOKE_SPECS = [
	"**/login.spec.ts",
	"**/wallets.spec.ts",
	"**/wallet-send-receive.spec.ts",
];

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
		// Keep traces for every failed test on CI so the uploaded artifact
		// is useful even when the retry passes; locally only on first retry.
		trace: process.env.CI ? "retain-on-failure" : "on-first-retry",
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
			// Fast, required critical-path tier. Runs the curated smoke specs
			// on desktop Chromium only so it stays quick enough to gate PRs.
			name: "smoke",
			testMatch: SMOKE_SPECS,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			// Complete suite tier. Runs every spec in `tests/e2e/` across the
			// desktop and mobile viewports; intended as a separate (possibly
			// non-blocking or scheduled) job rather than a per-PR gate.
			name: "full",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			// Narrow mobile viewport coverage per the manual verification checklist
			// (see tests/e2e/README.md) — catches layout regressions on small screens.
			name: "full-mobile",
			use: { ...devices["Pixel 7"] },
		},
	],
});
