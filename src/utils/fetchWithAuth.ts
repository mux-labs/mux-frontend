/**
 * fetchWithAuth
 *
 * A thin wrapper around the native `fetch` API that handles 401 Unauthorized
 * responses by clearing the client session and redirecting the user to the
 * login page with a callback URL.
 *
 * Usage:
 *   import { fetchWithAuth } from "@/utils/fetchWithAuth";
 *   const data = await fetchWithAuth("/api/wallets");
 */

/** Cookie / sessionStorage key — must match AuthContext constants. */
const SESSION_COOKIE_NAME = "mux_auth_session";
const SESSION_STORAGE_KEY = "mux_auth_user";

/** The path users are sent to after a 401. */
const LOGIN_PATH = "/login";

function clearClientSession(): void {
	try {
		if (typeof sessionStorage !== "undefined") {
			sessionStorage.removeItem(SESSION_STORAGE_KEY);
		}
	} catch {
		// sessionStorage unavailable (SSR / private browsing edge case)
	}

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

/**
 * Wraps `fetch` and intercepts 401 responses.
 *
 * On a 401:
 *  1. Clears the client-side session (sessionStorage + cookie).
 *  2. Redirects to the login page with a `callbackUrl` so the user can
 *     return after re-authenticating.
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

	if (response.status === 401) {
		clearClientSession();

		redirectToLogin(getCurrentCallbackUrl());

		throw new UnauthorizedError(
			"Session expired or invalid. Redirecting to login.",
		);
	}

	return response;
}

/** Thrown by `fetchWithAuth` when a 401 response is received. */
export class UnauthorizedError extends Error {
	constructor(message = "Unauthorized") {
		super(message);
		this.name = "UnauthorizedError";
	}
}
