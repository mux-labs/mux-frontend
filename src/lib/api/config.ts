import { getEnv } from "@/lib/env";

export function getApiBaseUrl(): string {
	const env = getEnv();
	const baseUrl =
		env.NEXT_PUBLIC_API_URL ??
		env.NEXT_PUBLIC_MUX_API_URL ??
		env.NEXT_PUBLIC_API_BASE ??
		"";

	return baseUrl.replace(/\/+$/, "");
}

export function getApiKey(): string | undefined {
	return getEnv().NEXT_PUBLIC_MUX_API_KEY;
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
