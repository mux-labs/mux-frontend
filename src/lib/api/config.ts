/**
 * Server-only backend proxy configuration.
 *
 * `MUX_BACKEND_URL` is deny-by-default: there is no fallback URL, so a
 * missing, blank, or malformed value yields `null` and callers must respond
 * with a `503 backend_not_configured` instead of mock data or an
 * unauthenticated passthrough. See `docs/frontend-env-vars.md`.
 */

export const BACKEND_NOT_CONFIGURED = "backend_not_configured" as const;

/**
 * Resolve the normalized backend base URL (no trailing slash), or `null`
 * when unset/invalid. Only `http:`/`https:` URLs without embedded
 * credentials are accepted.
 */
export function getBackendApiBaseUrl(
	env: Record<string, string | undefined> = process.env,
): string | null {
	const raw = env.MUX_BACKEND_URL?.trim();
	if (!raw) return null;

	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return null;
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") return null;
	if (url.username || url.password) return null;

	return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
}

/**
 * Build an upstream URL for `path` on the configured backend, or `null`
 * when the backend is not configured. `path` must be a relative API path so
 * callers cannot redirect the proxy to another host.
 */
export function buildBackendUrl(
	path: string,
	env: Record<string, string | undefined> = process.env,
): string | null {
	const base = getBackendApiBaseUrl(env);
	if (!base) return null;
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("..")) {
		return null;
	}
	return `${base}${path}`;
}
