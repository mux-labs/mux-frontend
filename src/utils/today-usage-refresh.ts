/**
 * todayUsage refresh without stampede (#833).
 *
 * Invariants:
 * - At most one in-flight fetch per key; concurrent callers share it (single-flight).
 * - Fresh values (within ttlMs) are served from cache without a network call.
 * - Failed refreshes are never cached as success; the error propagates (fail closed).
 * - Retries after failure are rate-limited by minRetryMs to avoid thundering herds.
 */

export interface TodayUsage {
	spent: number;
	limit: number;
	asOf: string;
}

export type TodayUsageErrorCode =
	| "USAGE_DEPENDENCY_UNAVAILABLE"
	| "USAGE_RATE_LIMITED";

export class TodayUsageError extends Error {
	constructor(
		public readonly code: TodayUsageErrorCode,
		public readonly correlationId: string,
	) {
		super(code);
		this.name = "TodayUsageError";
	}
}

export interface TodayUsageRefresherOptions {
	fetcher: (key: string) => Promise<TodayUsage>;
	ttlMs?: number;
	minRetryMs?: number;
	now?: () => number;
	onMetric?: (event: "hit" | "miss" | "shared" | "error", key: string) => void;
}

interface Entry {
	value?: TodayUsage;
	fetchedAt?: number;
	inflight?: Promise<TodayUsage>;
	lastErrorAt?: number;
}

const newCorrelationId = () =>
	typeof crypto !== "undefined" && "randomUUID" in crypto
		? crypto.randomUUID()
		: `usage-${Date.now().toString(36)}`;

export function createTodayUsageRefresher({
	fetcher,
	ttlMs = 30_000,
	minRetryMs = 5_000,
	now = Date.now,
	onMetric,
}: TodayUsageRefresherOptions) {
	const entries = new Map<string, Entry>();

	function get(key: string, { force = false } = {}): Promise<TodayUsage> {
		const entry = entries.get(key) ?? {};
		entries.set(key, entry);

		if (entry.inflight) {
			onMetric?.("shared", key);
			return entry.inflight;
		}
		if (
			!force &&
			entry.value &&
			entry.fetchedAt !== undefined &&
			now() - entry.fetchedAt < ttlMs
		) {
			onMetric?.("hit", key);
			return Promise.resolve(entry.value);
		}
		if (
			entry.lastErrorAt !== undefined &&
			now() - entry.lastErrorAt < minRetryMs
		) {
			onMetric?.("error", key);
			return Promise.reject(
				new TodayUsageError("USAGE_RATE_LIMITED", newCorrelationId()),
			);
		}

		onMetric?.("miss", key);
		entry.inflight = fetcher(key)
			.then((value) => {
				entry.value = value;
				entry.fetchedAt = now();
				entry.lastErrorAt = undefined;
				return value;
			})
			.catch(() => {
				entry.lastErrorAt = now();
				onMetric?.("error", key);
				throw new TodayUsageError(
					"USAGE_DEPENDENCY_UNAVAILABLE",
					newCorrelationId(),
				);
			})
			.finally(() => {
				entry.inflight = undefined;
			});
		return entry.inflight;
	}

	return {
		get,
		invalidate: (key: string) => entries.delete(key),
	};
}
