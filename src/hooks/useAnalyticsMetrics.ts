"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getApiBaseUrl } from "@/lib/api/config";
import { createApiClient } from "@/lib/api/index";
import type { AssetData, ChartDataPoint, Metric } from "@/mock-data/analytics";
import type { DateRangeParams } from "@/services/analyticsService";
import { fetchAllAnalytics } from "@/services/analyticsService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalyticsMetricsData {
	metrics: Metric[];
	volumeData: ChartDataPoint[];
	transactionsData: ChartDataPoint[];
	topAssets: AssetData[];
}

export type AnalyticsMetricsStatus =
	| "idle"
	| "loading"
	| "success"
	| "empty"
	| "error";

export interface UseAnalyticsMetricsResult {
	data: AnalyticsMetricsData | null;
	status: AnalyticsMetricsStatus;
	isLoading: boolean;
	isEmpty: boolean;
	isError: boolean;
	error: string | null;
	/** Re-trigger the fetch (e.g. after an error or manual refresh). */
	refetch: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isDataEmpty(data: AnalyticsMetricsData): boolean {
	return (
		data.metrics.length === 0 &&
		data.volumeData.length === 0 &&
		data.transactionsData.length === 0 &&
		data.topAssets.length === 0
	);
}

/**
 * Loads analytics data from the backend API for the given date range.
 *
 * Strategy:
 *  1. Attempt to fetch from the real API via `ApiClient`.
 *  2. If the API base URL is not configured (empty string) or the request
 *     fails, fall back to the local mock data so the UI is always functional
 *     during development and in environments without a live backend.
 *
 * The hook re-fetches whenever `range.from`, `range.to`, or `fetchKey`
 * changes, making it easy to wire up a date-range picker.
 */
export function useAnalyticsMetrics(
	range: DateRangeParams,
): UseAnalyticsMetricsResult {
	const [status, setStatus] = useState<AnalyticsMetricsStatus>("idle");
	const [data, setData] = useState<AnalyticsMetricsData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [fetchKey, setFetchKey] = useState(0);

	// Stable ref so the effect closure always sees the latest range without
	// needing it in the dependency array (avoids re-fetching on object identity
	// changes when the caller creates a new object with the same values).
	const rangeRef = useRef(range);
	useEffect(() => {
		rangeRef.current = range;
	}, [range]);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			setStatus("loading");
			setError(null);

			const currentRange = rangeRef.current;
			const baseUrl = getApiBaseUrl();

			try {
				let loaded: AnalyticsMetricsData;

				if (baseUrl) {
					// Real API path
					const client = createApiClient(baseUrl);
					loaded = await fetchAllAnalytics(client, currentRange);
				} else {
					// Fallback: load mock data (dynamic import keeps it tree-shakeable)
					const mock = await import("@/mock-data/analytics");

					// Simulate network latency in development so the skeleton renders.
					if (process.env.NODE_ENV === "development") {
						await new Promise((resolve) => setTimeout(resolve, 800));
					}

					loaded = {
						metrics: mock.metrics,
						volumeData: mock.volumeData,
						transactionsData: mock.transactionsData,
						topAssets: mock.topAssets,
					};
				}

				if (cancelled) return;

				setData(loaded);
				setStatus(isDataEmpty(loaded) ? "empty" : "success");
			} catch (err) {
				if (cancelled) return;

				// If the real API failed, try the mock fallback before surfacing an error
				if (baseUrl) {
					try {
						const mock = await import("@/mock-data/analytics");
						if (cancelled) return;
						const fallback: AnalyticsMetricsData = {
							metrics: mock.metrics,
							volumeData: mock.volumeData,
							transactionsData: mock.transactionsData,
							topAssets: mock.topAssets,
						};
						setData(fallback);
						setStatus(isDataEmpty(fallback) ? "empty" : "success");
						return;
					} catch {
						// Mock also failed — fall through to error state
					}
				}

				if (cancelled) return;
				const message =
					err instanceof Error ? err.message : "Failed to load analytics data.";
				setError(message);
				setStatus("error");
			}
		}

		load();

		return () => {
			cancelled = true;
		};
		// fetchKey triggers manual refetch; range values trigger range changes
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetchKey, range.from, range.to]);

	return {
		data,
		status,
		isLoading: status === "loading" || status === "idle",
		isEmpty: status === "empty",
		isError: status === "error",
		error,
		refetch: useCallback(() => setFetchKey((k) => k + 1), []),
	};
}
