/**
 * CSRF strategy for cookie-based auth (double-submit cookie).
 *
 * The session cookie (`mux_session`) is HttpOnly + SameSite=Lax. For any
 * state-changing request the client must also echo a non-HttpOnly CSRF token
 * cookie in the `x-csrf-token` header. The server compares both values and
 * fails closed on any mismatch. See docs/security-ux-guards.md#csrf-strategy.
 */

export const CSRF_COOKIE_NAME = "mux_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export type CsrfErrorCode = "CSRF_MISSING" | "CSRF_MISMATCH";

export type CsrfResult = { ok: true } | { ok: false; code: CsrfErrorCode };

export function isSafeMethod(method: string | undefined): boolean {
	return SAFE_METHODS.has((method ?? "GET").toUpperCase());
}

export function readCookie(
	cookieHeader: string | null | undefined,
	name: string,
): string | null {
	if (!cookieHeader) return null;
	for (const part of cookieHeader.split(";")) {
		const [key, ...rest] = part.trim().split("=");
		if (key === name) {
			const value = rest.join("=");
			return value ? decodeURIComponent(value) : null;
		}
	}
	return null;
}

/** Constant-time string comparison to avoid leaking token prefixes via timing. */
function safeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

/** Server-side check. Safe methods pass; unsafe methods fail closed. */
export function verifyCsrf(request: Request): CsrfResult {
	if (isSafeMethod(request.method)) return { ok: true };
	const cookieToken = readCookie(
		request.headers.get("cookie"),
		CSRF_COOKIE_NAME,
	);
	const headerToken = request.headers.get(CSRF_HEADER_NAME);
	if (!cookieToken || !headerToken) return { ok: false, code: "CSRF_MISSING" };
	if (!safeEqual(cookieToken, headerToken))
		return { ok: false, code: "CSRF_MISMATCH" };
	return { ok: true };
}

/** Client-side helper: attaches the CSRF header to unsafe requests. */
export function withCsrf(
	init: RequestInit = {},
	cookieSource?: string,
): RequestInit {
	if (isSafeMethod(init.method)) return init;
	const source =
		cookieSource ?? (typeof document !== "undefined" ? document.cookie : "");
	const token = readCookie(source, CSRF_COOKIE_NAME);
	if (!token) return init;
	const headers = new Headers(init.headers);
	headers.set(CSRF_HEADER_NAME, token);
	return { ...init, headers, credentials: init.credentials ?? "same-origin" };
}
