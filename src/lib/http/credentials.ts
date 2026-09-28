/**
 * Credential presence checks and forwarding for proxy API routes.
 *
 * These routes do not verify credentials themselves — the Mux backend is the
 * source of truth — but they refuse to proxy anonymous requests
 * (deny-by-default) and forward only the credential headers the backend
 * needs. Values are never logged.
 */

export const SESSION_COOKIE_NAME = "mux_session";

function readSessionCookie(request: Request): string | null {
	const header = request.headers.get("cookie");
	if (!header) return null;
	for (const part of header.split(";")) {
		const [name, ...rest] = part.trim().split("=");
		if (name === SESSION_COOKIE_NAME) {
			const value = rest.join("=");
			return value.length > 0 ? value : null;
		}
	}
	return null;
}

export function hasCredential(request: Request): boolean {
	const auth = request.headers.get("authorization");
	if (auth) {
		const [scheme, token] = auth.split(" ");
		return (scheme === "Bearer" || scheme === "ApiKey") && Boolean(token);
	}
	if (request.headers.get("x-api-key")?.trim()) return true;
	return readSessionCookie(request) !== null;
}

/** The credential headers to forward upstream (and nothing else). */
export function forwardCredentialHeaders(
	request: Request,
): Record<string, string> {
	const headers: Record<string, string> = {};
	const auth = request.headers.get("authorization");
	if (auth) headers.authorization = auth;
	const apiKey = request.headers.get("x-api-key");
	if (apiKey) headers["x-api-key"] = apiKey;
	const session = readSessionCookie(request);
	if (session !== null) headers.cookie = `${SESSION_COOKIE_NAME}=${session}`;
	return headers;
}

/** Raw credential material for hashing into a rate-limit key. */
export function credentialFingerprintSource(request: Request): string {
	return (
		request.headers.get("authorization") ??
		request.headers.get("x-api-key") ??
		readSessionCookie(request) ??
		""
	);
}

/**
 * CSRF guard for cookie-authenticated writes. Requests carrying an explicit
 * Authorization/API-key header are not ambient credentials and pass; a
 * cookie-only request must present an Origin matching this app's origin.
 */
export function isCsrfSafe(request: Request): boolean {
	if (
		request.headers.get("authorization") ||
		request.headers.get("x-api-key")
	) {
		return true;
	}
	const origin = request.headers.get("origin");
	if (!origin) return false;
	try {
		return origin === new URL(request.url).origin;
	} catch {
		return false;
	}
}
