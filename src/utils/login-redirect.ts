/**
 * Post-login redirect allowlist.
 *
 * `callbackUrl` comes from the query string and is attacker-controlled, so it
 * must never be passed straight to `router.push`. Only same-origin, relative
 * paths under an allowlisted prefix are accepted; anything else (absolute
 * URLs, protocol-relative `//evil.com`, backslash tricks, `javascript:`,
 * control characters) falls back to the default. Deny by default.
 */
export const DEFAULT_LOGIN_REDIRECT = "/dashboard";

export const LOGIN_REDIRECT_ALLOWLIST: readonly string[] = ["/dashboard"];

export function getSafeLoginRedirect(
	callbackUrl: string | null | undefined,
): string {
	if (!callbackUrl || callbackUrl.length > 2048) return DEFAULT_LOGIN_REDIRECT;

	let decoded: string;
	try {
		decoded = decodeURIComponent(callbackUrl);
	} catch {
		return DEFAULT_LOGIN_REDIRECT;
	}

	// Must be a single-slash relative path with no backslashes or control chars.
	if (
		!decoded.startsWith("/") ||
		decoded.startsWith("//") ||
		decoded.includes("\\") ||
		/[\u0000-\u001f\u007f]/.test(decoded)
	) {
		return DEFAULT_LOGIN_REDIRECT;
	}

	let url: URL;
	try {
		url = new URL(decoded, "http://mux.local");
	} catch {
		return DEFAULT_LOGIN_REDIRECT;
	}
	if (url.origin !== "http://mux.local") return DEFAULT_LOGIN_REDIRECT;

	const allowed = LOGIN_REDIRECT_ALLOWLIST.some(
		(prefix) =>
			url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
	);
	return allowed
		? `${url.pathname}${url.search}${url.hash}`
		: DEFAULT_LOGIN_REDIRECT;
}
