import { defineConfig, devices } from "@playwright/test";
import { loudly } from "./src/lib/e2e-env-guard";

/**
 * Playwright configuration for the real-backend CONTRACT specs in
 * tests/e2e/real-backend/ — see that directory's README.md and
 * docs/e2e-real-backend-testing.md for the full setup + runbook.
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

/**
 * Fail-closed guard: this config exists to exercise a REAL backend, so a
 * missing NEXT_PUBLIC_API_URL is a misconfiguration, not a reason to
 * silently fall back to the in-repo mock. Throwing here makes the whole
 * run fail loudly (and is asserted by
 * tests/e2e-real-backend.config.test.ts) instead of producing a green
 * run that never touched a real backend.
 *
 * Set E2E_REAL_BACKEND_ALLOW_MISSING_API_URL=1 to opt out (e.g. when
 * merely collecting/listing specs in CI without a backend available).
 */
export function assertRealBackendConfigured(): void {
	loudly("NEXT_PUBLIC_API_URL");
}

/**
 * Fail-closed guard for the credentials the real-backend specs need to
 * authenticate. Without them the specs self-skip, which would silently
 * turn a misconfigured CI job into a green run that never exercised the
 * critical path. Require them unless the caller explicitly opts out (the
 * same opt-out used for NEXT_PUBLIC_API_URL, e.g. when only listing specs).
 */
export function assertRealBackendCredentials(): void {
	loudly("E2E_TEST_EMAIL");
	loudly("E2E_TEST_PASSWORD");
}

assertRealBackendConfigured();
assertRealBackendCredentials();

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
		// Traces record `fill()` values and request bodies in plain text, so
		// they would capture E2E_TEST_PASSWORD. Keep them off for this suite
		// (see "Secrets handling" in docs/e2e-real-backend-testing.md).
		trace: "off",
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
