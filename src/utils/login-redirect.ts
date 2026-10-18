export const DEFAULT_LOGIN_REDIRECT = "/dashboard";

export const LOGIN_REDIRECT_ALLOWLIST = ["/dashboard"] as const;

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;
const OFF_ORIGIN_PARAM_PATTERN = /^(?:next|redirect|redirect_uri|redirect_url|return|return_to|returnTo|continue|url|target|dest|destination)$/i;

function isOffOriginValue(value: string): boolean {
	const trimmed = value.trim();
	if (trimmed === "") {
		return false;
	}
	if (trimmed.startsWith("//") || trimmed.startsWith("/\\") || trimmed.startsWith("\\")) {
		return true;
	}
	if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
		return true;
	}
	return false;
}

function hasUnsafeSearch(search: string): boolean {
	if (search === "") {
		return false;
	}
	if (search.includes("//") || search.includes("\\")) {
		return true;
	}
	const params = new URLSearchParams(search);
	for (const [key, value] of params) {
		if (OFF_ORIGIN_PARAM_PATTERN.test(key) && isOffOriginValue(value)) {
			return true;
		}
	}
	return false;
}

function hasUnsafeHash(hash: string): boolean {
	if (hash === "") {
		return false;
	}
	if (hash.includes("//") || hash.includes("\\")) {
		return true;
	}
	return false;
}

/**
 * Resolve a post-login redirect target, deny by default.
 *
 * Only paths under an allowlisted prefix are accepted; anything else
 * (absolute URLs, protocol-relative `//evil.com`, backslashes, control
 * characters, or query/fragment values that could smuggle a second path)
 * falls back to {@link DEFAULT_LOGIN_REDIRECT}.
 */
export function getSafeLoginRedirect(callbackUrl?: string | null): string {
	if (!callbackUrl) {
		return DEFAULT_LOGIN_REDIRECT;
	}

	let decoded: string;
	try {
		decoded = decodeURIComponent(callbackUrl);
	} catch {
		return DEFAULT_LOGIN_REDIRECT;
	}

	if (!decoded.startsWith("/") || decoded.startsWith("//")) {
		return DEFAULT_LOGIN_REDIRECT;
	}
	if (decoded.includes("\\") || CONTROL_CHARACTER_PATTERN.test(decoded)) {
		return DEFAULT_LOGIN_REDIRECT;
	}

	let url: URL;
	try {
		url = new URL(decoded, "https://placeholder.invalid");
	} catch {
		return DEFAULT_LOGIN_REDIRECT;
	}

	if (url.origin !== "https://placeholder.invalid") {
		return DEFAULT_LOGIN_REDIRECT;
	}

	const matchesAllowlist = LOGIN_REDIRECT_ALLOWLIST.some(
		(prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
	);
	if (!matchesAllowlist) {
		return DEFAULT_LOGIN_REDIRECT;
	}

	if (hasUnsafeSearch(url.search) || hasUnsafeHash(url.hash)) {
		return DEFAULT_LOGIN_REDIRECT;
	}

	return `${url.pathname}${url.search}${url.hash}`;
}
