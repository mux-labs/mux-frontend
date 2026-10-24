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

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

type CookieSource = Pick<Document, "cookie">;

export type CsrfResult = {
  init: RequestInit;
  ok: boolean;
};

function readCookie(name: string, source?: CookieSource): string | undefined {
  const cookie = source ? source.cookie : document.cookie;
  if (!cookie) return undefined;

  for (const part of cookie.split(";")) {
    const [rawKey, ...rest] = part.split("=");
    if (rawKey?.trim() === name) {
      return decodeURIComponent(rest.join("=").trim());
    }
  }
  return undefined;
}

/**
 * Reads a cookie value verbatim (no percent-decoding). Returns `null` when the
 * cookie is absent or empty. Decoding is intentionally skipped so the CSRF
 * comparison is symmetric with the raw header token.
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
			return value ? value : null;
		}
	}
	return null;
}

function isSafeMethod(method: string | undefined): boolean {
  return SAFE_METHODS.has((method ?? "GET").toUpperCase());
}

/**
 * Returns true when a CSRF token is available to attach to a request.
 */
export function hasCsrfToken(cookieSource?: CookieSource): boolean {
  return Boolean(readCookie(CSRF_COOKIE_NAME, cookieSource));
}

/**
 * Attaches the CSRF header to unsafe requests and reports whether it was
 * attached. Safe methods are returned unchanged with `ok: true`.
 */
export function tryWithCsrf(
  init: RequestInit = {},
  cookieSource?: CookieSource,
): CsrfResult {
  if (isSafeMethod(init.method)) {
    return { init, ok: true };
  }

  const token = readCookie(CSRF_COOKIE_NAME, cookieSource);
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
  cookieSource?: CookieSource,
): RequestInit {
  return tryWithCsrf(init, cookieSource).init;
}
