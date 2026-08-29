import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for the real-backend CONTRACT specs in
 * tests/e2e/real-backend/ — see that directory's README.md.
 *
 * playwright.config.ts (the default `pnpm run test:e2e`) forces
 * `NEXT_PUBLIC_API_URL: ""` in its webServer env so the primary smoke
 * suite always exercises the in-repo mock, deterministically, in every
 * environment. This config does the opposite on purpose: it does NOT set
 * NEXT_PUBLIC_API_URL, so `next dev` inherits whatever the invoking shell
 * has, and /api/auth/login + /api/wallets proxy to a real mux-backend
 * instead of falling back to mock responses (see
 * src/lib/api/config.ts::getApiBaseUrl / isMockFallbackAllowed).
 *
 * Specs here self-skip with a clear reason when NEXT_PUBLIC_API_URL,
 * E2E_TEST_EMAIL, or E2E_TEST_PASSWORD aren't set (see
 * tests/e2e/real-backend/helpers.ts), so running this config with nothing
 * configured is a no-op rather than a false pass against the mock.
 *
 * Run with:
 *   NEXT_PUBLIC_API_URL=https://staging-api.muxprotocol.com \
 *   E2E_TEST_EMAIL=... E2E_TEST_PASSWORD=... \
 *   pnpm exec playwright test --config=playwright.real-backend.config.ts
 *
 * Or against an already-running preview/staging frontend:
 *   PLAYWRIGHT_BASE_URL=https://staging.muxprotocol.com \
 *   NEXT_PUBLIC_API_URL=... E2E_TEST_EMAIL=... E2E_TEST_PASSWORD=... \
 *   pnpm exec playwright test --config=playwright.real-backend.config.ts
 */
export default defineConfig({
	testDir: "./tests/e2e/real-backend",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
	timeout: 30_000,
	expect: {
		timeout: 10_000,
	},
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	// Only spin up a local `next dev` when no already-running server was
	// given via PLAYWRIGHT_BASE_URL (e.g. a deployed staging preview).
	webServer: process.env.PLAYWRIGHT_BASE_URL
		? undefined
		: {
				command: "pnpm run dev",
				url: "http://localhost:3000/login",
				reuseExistingServer: !process.env.CI,
				timeout: 120_000,
				// Deliberately no `env` override here — NEXT_PUBLIC_API_URL must
				// pass through from the invoking shell (see the comment above).
			},
	projects: [
		{
			name: "desktop-chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
