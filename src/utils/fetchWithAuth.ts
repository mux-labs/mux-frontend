/**
 * fetchWithAuth
 *
 * A thin wrapper around the native `fetch` API that handles 401 Unauthorized
 * responses.
 *
 * On a 401 it mirrors `src/lib/api.js` (`apiFetch`): it first attempts a single
 * silent token refresh via `POST /api/auth/refresh` and retries the original
 * request. Only if that refresh (or the retried request) also fails does it
 * clear the client session and redirect the user to the login page with a
 * callback URL (#630).
 *
 * Usage:
 *   import { fetchWithAuth } from "@/utils/fetchWithAuth";
 *   const data = await fetchWithAuth("/api/wallets");
 */

import {
	clearSession as clearBearerSession,
	createSession as createBearerSession,
	loadSession,
	saveSession as saveBearerSession,
} from "@/lib/session";

/** Cookie / sessionStorage key — must match AuthContext constants. */
const SESSION_COOKIE_NAME = "mux_auth_session";
const SESSION_STORAGE_KEY = "mux_auth_user";

/** The path users are sent to after a 401. */
const LOGIN_PATH = "/login";

/** Endpoint that rotates the access token — see `src/app/api/auth/refresh`. */
const REFRESH_PATH = "/api/auth/refresh";

function clearClientSession(): void {
	try {
		if (typeof sessionStorage !== "undefined") {
			sessionStorage.removeItem(SESSION_STORAGE_KEY);
		}
	} catch {
		// sessionStorage unavailable (SSR / private browsing edge case)
	}

	// Drop the bearer-token session shared with `src/lib/api.js`.
	clearBearerSession();

	if (typeof document === "undefined") return;

	// Expire the session cookie immediately
	document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

function redirectToLogin(currentPath?: string): void {
	if (typeof window === "undefined") return;

	const url = new URL(LOGIN_PATH, window.location.origin);
	if (currentPath) {
		url.searchParams.set("callbackUrl", currentPath);
	}
	window.location.replace(url.toString());
}

function getCurrentCallbackUrl(): string | undefined {
	if (typeof window === "undefined") return undefined;

	return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

type RefreshTokenPayload = {
	accessToken?: string;
	refreshToken?: string;
	expiresIn?: number;
	expiresAt?: number;
};

/**
 * Attempts to rotate the session via `POST /api/auth/refresh`.
 *
 * Returns the refreshed access token (if the response carried one) on success,
 * or `null` when there is nothing to refresh with or the endpoint rejects. A
 * backend that authenticates purely through the refreshed HttpOnly cookie
 * returns no token block — that is still a successful refresh, so the retry
 * below can proceed on the cookie alone.
 */
async function refreshAccessToken(): Promise<{ accessToken?: string } | null> {
	if (typeof fetch === "undefined") return null;

	const session = loadSession() as { refreshToken?: string } | null;

	let response: Response;
	try {
		response = await fetch(REFRESH_PATH, {
			method: "POST",
			headers: { "content-type": "application/json" },
			credentials: "include",
			body: JSON.stringify(
				session?.refreshToken ? { refreshToken: session.refreshToken } : {},
			),
		});
	} catch {
		return null;
	}

	if (!response.ok) return null;

	const payload = (await response
		.json()
		.catch(() => ({}))) as RefreshTokenPayload;

	if (payload.accessToken) {
		const refreshed = createBearerSession({
			accessToken: payload.accessToken,
			refreshToken: payload.refreshToken ?? session?.refreshToken,
			expiresIn: payload.expiresIn,
			expiresAt: payload.expiresAt,
		});
		if (refreshed) saveBearerSession(refreshed);
	}

	return { accessToken: payload.accessToken };
}

/**
 * Returns a copy of `init` with the `Authorization` header replaced by the
 * freshly-refreshed access token, so the retried request doesn't re-send the
 * stale bearer token the caller built its headers with.
 */
function withRefreshedAuth(
	init: RequestInit | undefined,
	accessToken?: string,
): RequestInit | undefined {
	if (!accessToken) return init;

	const headers = new Headers(init?.headers ?? {});
	headers.set("Authorization", `Bearer ${accessToken}`);
	return { ...init, headers };
}

/**
 * Wraps `fetch` and intercepts 401 responses.
 *
 * On a 401:
 *  1. Calls `POST /api/auth/refresh` once and, if it succeeds, retries the
 *     original request with the rotated token.
 *  2. If the refresh fails — or the retried request is still a 401 — clears the
 *     client-side session (sessionStorage + bearer session + cookie) and
 *     redirects to the login page with a `callbackUrl`.
 *  3. Throws an `UnauthorizedError` so callers can handle it if needed.
 *
 * All other responses (including other error codes) are returned as-is,
 * leaving error handling to the caller.
 */
export async function fetchWithAuth(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	const response = await fetch(input, init);

	if (response.status !== 401) return response;

	const refreshed = await refreshAccessToken();
	if (refreshed) {
		const retry = await fetch(
			input,
			withRefreshedAuth(init, refreshed.accessToken),
		);
		if (retry.status !== 401) return retry;
	}

	clearClientSession();
	redirectToLogin(getCurrentCallbackUrl());

	throw new UnauthorizedError(
		"Session expired or invalid. Redirecting to login.",
	);
}

/** Thrown by `fetchWithAuth` when a 401 response is received. */
export class UnauthorizedError extends Error {
	constructor(message = "Unauthorized") {
		super(message);
		this.name = "UnauthorizedError";
	}
}
