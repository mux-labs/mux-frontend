/**
 * Analytics API service.
 *
 * Wraps the Mux Protocol backend endpoints for analytics data.
 * Falls back to mock data when the API base URL is not configured or when
 * running in a non-production environment without a real backend.
 *
 * All public functions are pure async — they accept an `ApiClient` instance
 * so they are easy to test with a mock client.
 */

import type ApiClient from "@/lib/api/client";
import type {
	AssetData,
	ChartDataPoint,
	Metric,
	Transaction,
} from "@/types/analytics";

// ---------------------------------------------------------------------------
// Response shapes expected from the backend
// ---------------------------------------------------------------------------

export interface MetricsResponse {
	metrics: Metric[];
}

export interface VolumeResponse {
	data: ChartDataPoint[];
}

export interface TransactionsResponse {
	data: ChartDataPoint[];
}

export interface TopAssetsResponse {
	assets: AssetData[];
}

export interface ExportTransactionsResponse {
	transactions: Transaction[];
}

export interface AnalyticsMetricsPayload {
	metrics: Metric[];
	volumeData: ChartDataPoint[];
	transactionsData: ChartDataPoint[];
	topAssets: AssetData[];
}

// ---------------------------------------------------------------------------
// Date-range query params
// ---------------------------------------------------------------------------

export interface DateRangeParams {
	from: string; // YYYY-MM-DD
	to: string; // YYYY-MM-DD
}

function toQueryString(params: DateRangeParams): string {
	return `?from=${encodeURIComponent(params.from)}&to=${encodeURIComponent(params.to)}`;
}

// ---------------------------------------------------------------------------
// Individual fetchers
// ---------------------------------------------------------------------------

export async function fetchMetrics(
	client: ApiClient,
	range: DateRangeParams,
): Promise<Metric[]> {
	const res = await client.get<MetricsResponse>(
		`/analytics/metrics${toQueryString(range)}`,
	);
	return res.metrics;
}

export async function fetchVolumeData(
	client: ApiClient,
	range: DateRangeParams,
): Promise<ChartDataPoint[]> {
	const res = await client.get<VolumeResponse>(
		`/analytics/volume${toQueryString(range)}`,
	);
	return res.data;
}

export async function fetchTransactionsData(
	client: ApiClient,
	range: DateRangeParams,
): Promise<ChartDataPoint[]> {
	const res = await client.get<TransactionsResponse>(
		`/analytics/transactions${toQueryString(range)}`,
	);
	return res.data;
}

export async function fetchTopAssets(
	client: ApiClient,
	range: DateRangeParams,
): Promise<AssetData[]> {
	const res = await client.get<TopAssetsResponse>(
		`/analytics/top-assets${toQueryString(range)}`,
	);
	return res.assets;
}

/**
 * Fetches the raw, export-shaped transaction list for a date range.
 *
 * This is the data source for the analytics export (CSV / JSON download),
 * replacing the previous stub that synthesised transaction objects from
 * `topAssets` rows. The endpoint is date-scoped: `from` and `to` are sent as
 * query params so the backend only returns transactions within the selected
 * range.
 *
 * @see `useAnalyticsTransactions` — `src/hooks/useAnalyticsTransactions.ts`
 */
export async function fetchExportTransactions(
	client: ApiClient,
	range: DateRangeParams,
): Promise<Transaction[]> {
	const res = await client.get<ExportTransactionsResponse>(
		`/analytics/transactions-list${toQueryString(range)}`,
	);
	return res.transactions ?? [];
}

// ---------------------------------------------------------------------------
// Aggregate fetcher — fetches all four in parallel
// ---------------------------------------------------------------------------

export async function fetchAllAnalytics(
	client: ApiClient,
	range: DateRangeParams,
): Promise<AnalyticsMetricsPayload> {
	const [metrics, volumeData, transactionsData, topAssets] = await Promise.all([
		fetchMetrics(client, range),
		fetchVolumeData(client, range),
		fetchTransactionsData(client, range),
		fetchTopAssets(client, range),
	]);

	return { metrics, volumeData, transactionsData, topAssets };
}
