"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getApiBaseUrl } from "@/lib/api/config";
import { createApiClient } from "@/lib/api/index";
import type { DateRangeParams } from "@/services/analyticsService";
import { fetchExportTransactions } from "@/services/analyticsService";
import type { Transaction } from "@/types/analytics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseAnalyticsTransactionsResult {
	/** Real per-transaction rows for the selected date range, in export shape. */
	transactions: Transaction[];
	status: "idle" | "loading" | "success" | "empty" | "error";
	isLoading: boolean;
	isEmpty: boolean;
	isError: boolean;
	error: string | null;
	/** Re-trigger the fetch (e.g. after an error or manual refresh). */
	refetch: () => void;
}

function isDataEmpty(transactions: Transaction[]): boolean {
	return transactions.length === 0;
}

/**
 * Loads the real, export-shaped transaction list for a date range.
 *
 * This backs the analytics export (CSV / JSON download) and deliberately
 * replaces the previous stub that synthesised transaction objects out of the
 * aggregated `topAssets` rows — the export now contains genuine transactions.
 *
 * Strategy (mirrors `useAnalyticsMetrics`):
 *  1. Attempt to fetch from the real API via `ApiClient`
 *     (`GET /analytics/transactions-list`).
 *  2. Outside of production, if the API base URL is not configured (empty
 *     string) or the request fails, fall back to the local mock export rows so
 *     the UI stays functional during development and in environments without a
 *     live backend.
 *  3. In production, a missing API base URL or a failed request is always
 *     surfaced as an error — the export must never silently report success
 *     with mock rows while the real backend is unreachable.
 */
export function useAnalyticsTransactions(
	range: DateRangeParams,
): UseAnalyticsTransactionsResult {
	const [status, setStatus] = useState<
		"idle" | "loading" | "success" | "empty" | "error"
	>("idle");
	const [transactions, setTransactions] = useState<Transaction[]>([]);
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
		const isProduction = process.env.NODE_ENV === "production";

		async function load() {
			setStatus("loading");
			setError(null);

			const currentRange = rangeRef.current;
			const baseUrl = getApiBaseUrl();

			try {
				let loaded: Transaction[];

				if (baseUrl) {
					// Real API path
					const client = createApiClient(baseUrl);
					loaded = await fetchExportTransactions(client, currentRange);
				} else if (isProduction) {
					// No backend configured in production — do not silently report
					// success with mock rows, since that would hide a real outage.
					throw new Error(
						"Transactions list is not configured (NEXT_PUBLIC_API_URL is unset).",
					);
				} else {
					// Fallback: load mock export rows.
					const { exportTransactions: mock } = await import(
						"@/mock-data/analytics"
					);

					if (process.env.NODE_ENV === "development") {
						await new Promise((resolve) => setTimeout(resolve, 800));
					}

					loaded = mock;
				}

				if (cancelled) return;

				setTransactions(loaded);
				setStatus(isDataEmpty(loaded) ? "empty" : "success");
			} catch (err) {
				if (cancelled) return;

				if (baseUrl && !isProduction) {
					try {
						const { exportTransactions: mock } = await import(
							"@/mock-data/analytics"
						);
						if (cancelled) return;
						setTransactions(mock);
						setStatus(isDataEmpty(mock) ? "empty" : "success");
						return;
					} catch {
						// Mock also failed — fall through to error state
					}
				}

				if (cancelled) return;
				const message =
					err instanceof Error ? err.message : "Failed to load transactions.";
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
		transactions,
		status,
		isLoading: status === "loading" || status === "idle",
		isEmpty: status === "empty",
		isError: status === "error",
		error,
		refetch: useCallback(() => setFetchKey((k) => k + 1), []),
	};
}
