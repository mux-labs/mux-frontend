/**
 * Server-side route-access evaluation (#621).
 *
 * The Next.js middleware used to trust the mere *presence* of the
 * `mux_auth_session` marker cookie — a value the browser sets itself, with no
 * server verification. That means anyone could hand-craft `mux_auth_session=1`
 * and reach `/dashboard`.
 *
 * This module makes the check provider-agnostic and server-verified:
 *
 *  - When a backend is configured (`NEXT_PUBLIC_API_URL` / aliases), a
 *    protected route requires a real, opaque session token
 *    (`mux_auth_token`, HttpOnly, set by `/api/auth/login` from the backend
 *    response) that the backend confirms is still valid via
 *    `GET {backend}/auth/session`. The client-set marker cookie alone is
 *    never trusted in this mode.
 *  - When no backend is configured (local dev / CI against in-repo mocks),
 *    there is nothing to verify against, so the marker cookie is accepted as
 *    before so `pnpm dev` keeps working.
 *
 * The pure `evaluateAccess` function keeps this logic unit-testable without a
 * live edge runtime; `src/middleware.ts` is a thin wrapper around it.
 */

/** Route prefixes that require authentication. */
export const PROTECTED_PREFIXES = ["/dashboard", "/recovery"];

/** HttpOnly cookie holding the backend-issued opaque session token. */
export const SESSION_TOKEN_COOKIE = "mux_auth_token";

/** Legacy client-set marker cookie (value "1"), used only in mock mode. */
export const SESSION_MARKER_COOKIE = "mux_auth_session";

/** Where unauthenticated users are sent. */
export const LOGIN_PATH = "/login";

export function isProtectedPath(pathname: string): boolean {
	return PROTECTED_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
}

export type AccessDecision =
	| { allow: true }
	| { allow: false; reason: "no-token" | "invalid-token" | "no-marker" };

interface EvaluateAccessOptions {
	pathname: string;
	/** Value of the HttpOnly backend session-token cookie, if present. */
	token?: string;
	/** Value of the legacy marker cookie, if present. */
	marker?: string;
	/** Resolved backend base URL ("" when none is configured). */
	backendUrl: string;
	/** Verifies `token` against the backend; resolves true when still valid. */
	verifyToken: (backendUrl: string, token: string) => Promise<boolean>;
}

/**
 * Decides whether a request may proceed to a protected route.
 *
 * Non-protected paths always resolve to `{ allow: true }`.
 */
export async function evaluateAccess(
	opts: EvaluateAccessOptions,
): Promise<AccessDecision> {
	const { pathname, token, marker, backendUrl, verifyToken } = opts;

	if (!isProtectedPath(pathname)) {
		return { allow: true };
	}

	if (backendUrl) {
		// Server-verified mode: a real, backend-confirmed token is required.
		if (!token) {
			return { allow: false, reason: "no-token" };
		}
		const valid = await verifyToken(backendUrl, token);
		return valid ? { allow: true } : { allow: false, reason: "invalid-token" };
	}

	// Mock mode (no backend): accept the marker cookie as before.
	if (!marker) {
		return { allow: false, reason: "no-marker" };
	}
	return { allow: true };
}

/**
 * Calls the backend to confirm an opaque session token is still valid.
 * Any non-2xx response or network error is treated as "not valid" so the
 * middleware fails closed.
 */
export async function verifySessionToken(
	backendUrl: string,
	token: string,
): Promise<boolean> {
	try {
		const res = await fetch(`${backendUrl}/auth/session`, {
			headers: {
				authorization: `Bearer ${token}`,
				cookie: `${SESSION_TOKEN_COOKIE}=${token}`,
			},
			cache: "no-store",
		});
		return res.ok;
	} catch {
		return false;
	}
}
