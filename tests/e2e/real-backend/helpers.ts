/**
 * Shared env plumbing for the real-backend contract specs in this
 * directory (see ./README.md).
 *
 * tests/e2e/login.spec.ts and tests/e2e/wallets.spec.ts intentionally only
 * prove client wiring against the in-repo mock (their own header comments
 * say as much): the mock `/api/auth/login` accepts any well-formed
 * credentials, and the mock `/api/wallets` checks a hardcoded bearer token
 * (`mock-access-token`, see src/app/api/wallets/route.ts). Pointed at a
 * real mux-backend, those assumptions don't hold — this directory closes
 * that gap with specs that never stub a route and never assume the mock
 * fixture data or mock credentials.
 */

export interface RealBackendEnv {
	apiUrl: string;
	email: string;
	password: string;
}

/**
 * Returns the env this suite needs to exercise a real backend, or `null`
 * when any piece is missing. Callers should skip rather than fall through
 * to mock-shaped assertions — silently passing against the mock is exactly
 * the false-confidence failure mode this suite exists to avoid.
 */
export function readRealBackendEnv(): RealBackendEnv | null {
	const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
	const email = process.env.E2E_TEST_EMAIL?.trim();
	const password = process.env.E2E_TEST_PASSWORD?.trim();

	if (!apiUrl || !email || !password) {
		return null;
	}

	return { apiUrl, email, password };
}

export const REAL_BACKEND_SKIP_REASON =
	"Real-backend e2e specs require NEXT_PUBLIC_API_URL, E2E_TEST_EMAIL, and " +
	"E2E_TEST_PASSWORD to point at a live mux-backend and a real test " +
	"account. Run via `pnpm exec playwright test " +
	"--config=playwright.real-backend.config.ts` with those set (see " +
	"tests/e2e/real-backend/README.md). Skipping is expected for the " +
	"default `pnpm run test:e2e`, which stays mock-only.";
