/**
 * loudly throws when a required environment variable is absent or empty,
 * causing the whole run to fail immediately rather than silently testing
 * the wrong target.
 *
 * Playwright configuration for the real-backend CONTRACT specs in
 * tests/e2e/real-backend/ — see that directory's README.md and
 * docs/e2e-real-backend-testing.md for the full setup + runbook.
 * playwright.config.ts (the default `pnpm run test:e2e`) forces
 * NEXT_PUBLIC_API_URL: "" in its webServer env so the primary smoke suite
 * always exercises the in-repo mock, deterministically, in every environment.
 * This config does the opposite: it requires a live URL and fails loudly
 * when that env var is absent, preventing silent misconfiguration.
 *
 * Set E2E_REAL_BACKEND_ALLOW_MISSING_API_URL=1 to opt out (e.g. when
 * merely collecting/listing specs in CI without a backend available).
 *
 * Exported for regression testing (issue #1161).
 *
 * @param envVar - name of the env var that must be non-empty
 * @returns the non-empty value, or undefined when opt-out is set
 * @throws Error when the var is absent or empty (and opt-out is not set)
 */
export function loudly(envVar: string): string | undefined {
	if (process.env.E2E_REAL_BACKEND_ALLOW_MISSING_API_URL === "1") {
		return process.env[envVar];
	}
	const value = process.env[envVar];
	if (!value || value.trim() === "") {
		throw new Error(
			`playwright.real-backend.config.ts requires ${envVar} to point at a real mux-backend (fail-closed). ` +
				`Set ${envVar}, or set E2E_REAL_BACKEND_ALLOW_MISSING_API_URL=1 to explicitly opt out.`,
		);
	}
	return value;
}
