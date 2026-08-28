/**
 * Local/dev-only mock store for per-API-key usage analytics.
 *
 * `src/app/api/api-keys/[id]/usage/route.ts` only reads from this store as a
 * fallback when no backend URL (`NEXT_PUBLIC_API_URL`/legacy aliases) is
 * configured, so local dev/CI keeps working without a running API server. In
 * any environment with a backend configured, per-key usage is served by the
 * real mux-backend API instead. Never used as a source of truth in
 * production — see `isMockFallbackAllowed()` in `src/lib/api/config.ts`.
 */

/** A single day's request volume for an API key. */
export interface ApiKeyUsagePoint {
	/** ISO date (YYYY-MM-DD). */
	date: string;
	requests: number;
}

export interface ApiKeyUsageSummary {
	apiKeyId: string;
	/** Total requests made with this key over the returned window. */
	totalRequests: number;
	/** Requests in the most recent 24h. */
	requestsLast24h: number;
	/** ISO timestamp of the most recent request, or null if never used. */
	lastUsedAt: string | null;
	/** Daily request counts, oldest first, for the last 14 days. */
	dailyRequests: ApiKeyUsagePoint[];
}

function seededRandom(seed: number) {
	let value = seed;
	return () => {
		value = (value * 9301 + 49297) % 233280;
		return value / 233280;
	};
}

/** Deterministically hashes a key id into a numeric seed so mock usage is stable per key. */
function seedFromId(id: string): number {
	let hash = 0;
	for (let i = 0; i < id.length; i += 1) {
		hash = (hash * 31 + id.charCodeAt(i)) % 100000;
	}
	return hash || 1;
}

const DAYS_OF_HISTORY = 14;

export function getApiKeyUsage(apiKeyId: string): ApiKeyUsageSummary {
	const random = seededRandom(seedFromId(apiKeyId));
	const today = new Date();
	const dailyRequests: ApiKeyUsagePoint[] = [];

	for (let i = DAYS_OF_HISTORY - 1; i >= 0; i -= 1) {
		const day = new Date(today);
		day.setUTCDate(today.getUTCDate() - i);
		const requests = Math.floor(random() * 500);
		dailyRequests.push({
			date: day.toISOString().slice(0, 10),
			requests,
		});
	}

	const totalRequests = dailyRequests.reduce(
		(sum, point) => sum + point.requests,
		0,
	);
	const requestsLast24h = dailyRequests[dailyRequests.length - 1]?.requests ?? 0;

	return {
		apiKeyId,
		totalRequests,
		requestsLast24h,
		lastUsedAt: requestsLast24h > 0 ? today.toISOString() : null,
		dailyRequests,
	};
}
