/**
 * Server-side backend base URL resolution for API route proxies.
 *
 * Walks `MUX_BACKEND_URL` (server-only) then the documented public aliases in
 * priority order and returns the first non-empty value. Blank or non-http(s)
 * values are treated as unset so a misconfigured deploy fails closed instead
 * of proxying to an unintended host. The resolved URL is never logged or
 * returned to clients.
 */

export const BACKEND_URL_CANDIDATES = [
	"MUX_BACKEND_URL",
	"NEXT_PUBLIC_API_URL",
	"NEXT_PUBLIC_MUX_API_URL",
	"NEXT_PUBLIC_API_BASE",
] as const;

type Env = Record<string, string | undefined>;

export function getBackendBaseUrl(env: Env = process.env): string | null {
	for (const name of BACKEND_URL_CANDIDATES) {
		const value = env[name]?.trim();
		if (!value) continue;
		try {
			const url = new URL(value);
			if (url.protocol !== "https:" && url.protocol !== "http:") return null;
			return value.replace(/\/+$/, "");
		} catch {
			return null;
		}
	}
	return null;
}

/** Mock fallbacks are never allowed in production or against mainnet. */
export function isMockFallbackAllowed(env: Env = process.env): boolean {
	if (env.NODE_ENV === "production") return false;
	const network = (configuredNetwork(env) ?? "").toLowerCase();
	return network !== "mainnet" && network !== "public";
}

/**
 * The configured Stellar network name: `MUX_STELLAR_NETWORK`, then
 * `NEXT_PUBLIC_STELLAR_NETWORK`. Blank values count as unset so an empty
 * server var cannot mask a mainnet public var.
 */
export function configuredNetwork(env: Env = process.env): string | null {
	for (const name of ["MUX_STELLAR_NETWORK", "NEXT_PUBLIC_STELLAR_NETWORK"]) {
		const value = env[name]?.trim();
		if (value) return value;
	}
	return null;
}
