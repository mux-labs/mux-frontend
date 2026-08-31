/**
 * API configuration helpers.
 *
 * ## API base URL resolution (#693)
 *
 * Three environment variables map to the same concept — the public Mux
 * backend base URL — for historical reasons.  The resolution order is:
 *
 *   1. `NEXT_PUBLIC_API_URL`      — canonical name; set this in new deploys.
 *   2. `NEXT_PUBLIC_MUX_API_URL`  — legacy alias; kept for backward compat.
 *   3. `NEXT_PUBLIC_API_BASE`     — third fallback; also legacy.
 *   4. `""`                       — empty string signals "no backend configured".
 *
 * Only the *first non-empty* value wins.  An empty string (e.g. `NEXT_PUBLIC_API_URL=`)
 * is treated as unset and the chain continues to the next alias, so mis-set
 * deploys that accidentally blank-out the primary var still pick up the
 * legacy alias instead of silently hitting no backend.
 *
 * In production (`NODE_ENV=production`) `getEnv()` applies documented
 * defaults (e.g. `NEXT_PUBLIC_MUX_API_URL → https://api.muxprotocol.com`)
 * for any var that is completely absent from the process environment, so a
 * forgotten env var in production resolves to the real backend rather than
 * returning an empty string and serving mock data (see `src/lib/env.ts`).
 *
 * `getBackendApiBaseUrl()` reads a *different* var (`MUX_BACKEND_URL`) that
 * is server-only — never inlined into the browser bundle — and has no public
 * fallback chain.  Callers that receive `""` must respond `503` rather than
 * falling back to fabricated data.
 */

import { getEnv } from "@/lib/env";

/**
 * Candidates for the public API base URL, in descending priority order.
 * Exported so tests can verify the exact resolution chain without reimplementing it.
 */
export const API_URL_CANDIDATES = [
	"NEXT_PUBLIC_API_URL",
	"NEXT_PUBLIC_MUX_API_URL",
	"NEXT_PUBLIC_API_BASE",
] as const;

export type ApiUrlCandidate = (typeof API_URL_CANDIDATES)[number];

/**
 * Resolves the public Mux backend base URL by walking the alias chain
 * {@link API_URL_CANDIDATES} and returning the first non-empty value.
 *
 * Trailing slashes are normalised so callers can always append a path
 * starting with `/` without worrying about double-slashes.
 *
 * Returns `""` when none of the aliases are configured — callers should
 * treat this as "no backend; use mock fallback if allowed".
 */
export function getApiBaseUrl(): string {
	const env = getEnv();

	for (const candidate of API_URL_CANDIDATES) {
		const value = env[candidate];
		if (value && value.trim() !== "") {
			return value.replace(/\/+$/, "");
		}
	}

	return "";
}

/**
 * Returns the name of the environment variable that {@link getApiBaseUrl}
 * will read from, or `null` when no alias is configured.
 *
 * Useful in diagnostics / startup logging so operators can see which alias
 * is actually in effect.
 */
export function getActiveApiUrlVar(): ApiUrlCandidate | null {
	const env = getEnv();

	for (const candidate of API_URL_CANDIDATES) {
		const value = env[candidate];
		if (value && value.trim() !== "") {
			return candidate;
		}
	}

	return null;
}

/**
 * Server-only Mux Protocol credentials. These must never be read from a
 * NEXT_PUBLIC_* var or passed into a client component — see MUX_API_KEY /
 * MUX_API_SECRET in src/lib/env.ts.
 */
export function getApiKey(): string | undefined {
	return getEnv().MUX_API_KEY;
}

/** @deprecated Use {@link getApiKey} instead. */
export function getServerApiKey(): string | undefined {
	return getApiKey();
}

export function getApiSecret(): string | undefined {
	return getEnv().MUX_API_SECRET;
}

/** Auth headers for server-side requests to the upstream Mux backend. */
export function getUpstreamAuthHeaders(): Record<string, string> {
	const apiKey = getApiKey();
	const apiSecret = getApiSecret();
	return {
		...(apiKey ? { "x-api-key": apiKey } : {}),
		...(apiSecret ? { "x-api-secret": apiSecret } : {}),
	};
}

/**
 * Whether Next.js API routes (`/api/wallets`, `/api/auth/*`) may fall back
 * to their in-repo mock implementation when no backend URL is configured.
 *
 * The mock fallback exists purely so `pnpm run dev`, CI, and the `/demo`
 * routes work without a live `mux-backend`. It must never activate in a
 * real production deployment: it serves fabricated wallet/analytics data
 * and accepts hardcoded bearer tokens (`mock-access-token`,
 * `mock-refresh-token`), which would amount to an authentication bypass if
 * `NEXT_PUBLIC_API_URL` (or its aliases) were ever left unset in prod by
 * mistake. Route handlers should call this before serving mock data and
 * return an explicit error instead when it's `false`.
 */
export function isMockFallbackAllowed(): boolean {
	return getEnv().NODE_ENV !== "production";
}

/**
 * Server-only base URL for the `mux-backend` service that owns persistent
 * account state (spending limits, real usage counters).
 *
 * Unlike {@link getApiBaseUrl}, this is read from `MUX_BACKEND_URL` — a
 * server-only var, never inlined into the browser bundle — so it can point
 * at an internal backend host. Returns `""` when unset; callers
 * (`/api/spending-limits`) must treat that as "backend not configured" and
 * respond `503` rather than falling back to fabricated data.
 */
export function getBackendApiBaseUrl(): string {
	return (getEnv().MUX_BACKEND_URL ?? "").replace(/\/+$/, "");
}
