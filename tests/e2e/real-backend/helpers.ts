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

/**
 * Stable error codes the real mux-backend login surface is expected to
 * return (see docs/security-ux-guards.md and docs/e2e-real-backend-testing.md).
 * Specs assert against these instead of free-form messages so a backend
 * copy change can't silently weaken the login contract.
 */
export const LOGIN_ERROR_CODES = {
	invalidCredentials: "AUTH_INVALID_CREDENTIALS",
	unauthorized: "AUTH_UNAUTHORIZED",
	forbidden: "AUTH_FORBIDDEN",
	rateLimited: "AUTH_RATE_LIMITED",
} as const;

export type LoginErrorCode =
	(typeof LOGIN_ERROR_CODES)[keyof typeof LOGIN_ERROR_CODES];

/**
 * Shape of the login response body the real backend is expected to return.
 * `correlationId` is required so failures can be traced end-to-end without
 * leaking tokens or key material into logs.
 */
export interface RealBackendLoginResponse {
	accessToken: string;
	correlationId: string;
}

/**
 * Shape of a login error body. `code` is one of LOGIN_ERROR_CODES and
 * `correlationId` is echoed back so ops can correlate a client failure with
 * a server log line without exposing secrets.
 */
export interface RealBackendLoginError {
	code: LoginErrorCode;
	correlationId: string;
}

/**
 * Reads the correlation id from a response without assuming a body shape.
 * Returns `null` when the header/body is absent so callers can assert on
 * presence explicitly rather than silently accepting a missing id.
 */
export function readCorrelationId(
	headers: { get(name: string): string | null },
	body: unknown,
): string | null {
	const headerId = headers.get("x-correlation-id")?.trim();
	if (headerId) {
		return headerId;
	}

	if (body && typeof body === "object" && "correlationId" in body) {
		const value = (body as { correlationId?: unknown }).correlationId;
		if (typeof value === "string" && value.trim()) {
			return value.trim();
		}
	}

	return null;
}

/**
 * Redacts a bearer token for safe logging in spec failure output. Never
 * print raw tokens or key material — see docs/security-ux-guards.md.
 */
export function redactToken(token: string): string {
	if (token.length <= 8) {
		return "***";
	}
	return `${token.slice(0, 4)}…${token.slice(-4)}`;
}
