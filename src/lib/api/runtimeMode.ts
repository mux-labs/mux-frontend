import { getApiBaseUrl } from "@/lib/api/config";

/**
 * Runtime-mode helpers that make the "real backend vs demo/mock" split
 * explicit and consistent across API routes and hooks.
 *
 * The rule everywhere in this app:
 *
 *  - A backend is configured (`NEXT_PUBLIC_API_URL` / legacy aliases) →
 *    always talk to the real backend.
 *  - No backend + not a production build → fall back to in-repo mock data
 *    so `pnpm dev` / CI keep working without a live API.
 *  - No backend + production build → surface an error. Mock/demo data must
 *    never be served silently in production, since that would hide a real
 *    outage or misconfiguration from operators.
 */

/** True when this is a production build (`NODE_ENV=production`). */
export function isProductionRuntime(): boolean {
	return process.env.NODE_ENV === "production";
}

/** True when a real backend base URL is configured. */
export function hasBackendConfigured(): boolean {
	return getApiBaseUrl() !== "";
}

/**
 * True when it is safe to fall back to in-repo mock/demo data: only outside
 * production, and only when no real backend is configured.
 */
export function canUseMockFallback(): boolean {
	return !isProductionRuntime() && !hasBackendConfigured();
}

/**
 * Throws when a production build has no backend configured. Call this before
 * returning mock/demo data so production never reports a silent mock success.
 *
 * @param feature - Human-readable feature name for the error message.
 */
export function assertBackendOrDemo(feature: string): void {
	if (isProductionRuntime() && !hasBackendConfigured()) {
		throw new Error(
			`${feature} is unavailable: no backend is configured ` +
				`(set NEXT_PUBLIC_API_URL). Mock data is not served in production.`,
		);
	}
}
