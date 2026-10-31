/**
 * Client-side CSRF helper.
 *
 * The session cookie (`mux_session`) is HttpOnly + SameSite=Lax. For any
 * state-changing request the client must also echo a non-HttpOnly CSRF token
 * cookie in the `x-csrf-token` header. The server compares both values and
 * fails closed on any mismatch. See docs/security-ux-guards.md#csrf-strategy.
 *
 * Normalization rule: the double-submit comparison uses the raw, undecoded
 * cookie value against the header value verbatim. Neither side is
 * percent-decoded, so a cookie/header pair that differs only by URL-encoding
 * is rejected symmetrically. Malformed cookies are treated as absent.
 *
 * The server issues a CSRF token in a readable cookie and fails closed with
 * `CSRF_MISSING` when an unsafe request arrives without the `x-csrf-token`
 * header. `withCsrf` attaches that header from the cookie; `tryWithCsrf`
 * additionally reports whether the header could be attached so callers can
 * gate the request instead of discovering the failure as an opaque 403.
 */

export const CSRF_COOKIE_NAME = "mux_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

export type CsrfErrorCode = "CSRF_MISSING" | "CSRF_MISMATCH";
export type CsrfResult = { ok: true } | { ok: false; code: CsrfErrorCode };

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Checks if a string contains valid percent-encoding (no bare % or incomplete sequences).
 * Returns true if the string is safe to use as-is for symmetric comparison.
 */
function hasValidPercentEncoding(str: string): boolean {
	for (let i = 0; i < str.length; i++) {
		if (str[i] === "%") {
			if (i + 2 >= str.length) return false;
			const hex = str.slice(i + 1, i + 3);
			if (!/^[0-9A-Fa-f]{2}$/.test(hex)) return false;
			i += 2;
		}
	}
	return true;
}

/**
 * Reads a cookie value verbatim (no percent-decoding). Returns `null` when the
 * cookie is absent or empty. Decoding is intentionally skipped so the CSRF
 * comparison is symmetric with the raw header token. Malformed percent-encoding
 * is treated as an absent cookie.
 */
export function readCookie(
	cookieHeader: string | null | undefined,
	name: string,
): string | null {
	if (!cookieHeader) return null;
	for (const part of cookieHeader.split(";")) {
		const [key, ...rest] = part.trim().split("=");
		if (key === name) {
			const value = rest.join("=");
			if (!value) return null;
			if (!hasValidPercentEncoding(value)) return null;
			return value;
		}
	}
	return null;
}

/** Reads and decodes a cookie from a cookie string (client-side). */
function readClientCookie(
	cookieHeader: string | undefined,
	name: string,
): string | undefined {
	if (!cookieHeader) return undefined;
	for (const part of cookieHeader.split(";")) {
		const [rawKey, ...rest] = part.split("=");
		if (rawKey?.trim() === name) {
			return decodeURIComponent(rest.join("=").trim());
		}
	}
	return undefined;
}

/** Constant-time string comparison to avoid leaking token prefixes via timing. */
function safeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

function isSafeMethod(method: string | undefined): boolean {
	return SAFE_METHODS.has((method ?? "GET").toUpperCase());
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

/**
 * Returns true when a CSRF token is available to attach to a request.
 */
export function hasCsrfToken(cookieHeader?: string): boolean {
	return Boolean(readClientCookie(cookieHeader, CSRF_COOKIE_NAME));
}

/**
 * Attaches the CSRF header to unsafe requests and reports whether it was
 * attached. Safe methods are returned unchanged with `ok: false`.
 */
export function tryWithCsrf(
	init: RequestInit = {},
	cookieHeader?: string,
): { init: RequestInit; ok: boolean } {
	if (isSafeMethod(init.method)) {
		return { init, ok: false };
	}

	const token = readClientCookie(cookieHeader, CSRF_COOKIE_NAME);
	if (!token) {
		return { init, ok: false };
	}

	const headers = new Headers(init.headers);
	headers.set(CSRF_HEADER_NAME, token);

	return {
		init: {
			...init,
			headers,
			credentials: init.credentials ?? "same-origin",
		},
		ok: true,
	};
}

/**
 * Attaches the CSRF header to unsafe requests. When no token is available the
 * init is returned unchanged; use `tryWithCsrf` to detect that case.
 */
export function withCsrf(
	init: RequestInit = {},
	cookieHeader?: string,
): RequestInit {
	if (isSafeMethod(init.method)) {
		return init;
	}

	const token = readClientCookie(cookieHeader, CSRF_COOKIE_NAME);
	if (!token) {
		return init;
	}

	const headers = new Headers(init.headers);
	headers.set(CSRF_HEADER_NAME, token);

	return {
		...init,
		headers,
		credentials: init.credentials ?? "same-origin",
	};
}