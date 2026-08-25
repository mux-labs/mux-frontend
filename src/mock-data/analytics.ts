/**
 * @file analytics.ts
 * @description Mock analytics data for the Mux Protocol dashboard.
 *
 * All exports are static, deterministic, and representative of a typical week
 * of platform activity. They are consumed directly by the analytics page and
 * its child components during development and in environments without a live
 * backend.
 *
 * **Data sources documentation:** `src/docs/Analytics_Data_Sources.md`
 *
 * When a real backend is available, replace the direct imports of these
 * constants with calls to the appropriate service functions in
 * `src/services/analyticsService.ts`. The component props accept the same
 * types, so no component changes are required.
 *
 * The response-shape types (`Metric`, `ChartDataPoint`, `AssetData`) live in
 * `src/types/analytics.ts` as shared domain types — this module re-exports
 * them for existing call sites and otherwise only holds mock data values.
 */

// ---------------------------------------------------------------------------
// Types (re-exported from the shared domain types module)
// ---------------------------------------------------------------------------

import type { AssetData, ChartDataPoint, Metric } from "@/types/analytics";

export type { Metric, ChartDataPoint, AssetData } from "@/types/analytics";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

/**
 * Four KPI metrics displayed in the MetricsCards grid.
 *
 * Covers: Total Volume, Total Transactions, Active Wallets, Success Rate.
 *
 * @see MetricsCards — `src/components/analytics/MetricsCards.tsx`
 * @see Analytics_Data_Sources.md — `src/docs/Analytics_Data_Sources.md`
 */
export const metrics: Metric[] = [
	{
		label: "Total Volume",
		value: "$12.4M",
		change: 12.5,
		changeLabel: "vs last period",
	},
	{
		label: "Total Transactions",
		value: "84,231",
		change: 8.2,
		changeLabel: "vs last period",
	},
	{
		label: "Active Wallets",
		value: "3,842",
		change: -2.1,
		changeLabel: "vs last period",
	},
	{
		label: "Success Rate",
		value: "99.2%",
		change: 0.3,
		changeLabel: "vs last period",
	},
];

/**
 * Seven daily trading volume data points (Mon–Sun), values in USD.
 *
 * Used by the "Volume Over Time" AnalyticsChart.
 *
 * @see AnalyticsChart — `src/components/analytics/AnalyticsChart.tsx`
 * @see Analytics_Data_Sources.md — `src/docs/Analytics_Data_Sources.md`
 */
export const volumeData: ChartDataPoint[] = [
	{ date: "Mon", value: 2400000 },
	{ date: "Tue", value: 3200000 },
	{ date: "Wed", value: 2800000 },
	{ date: "Thu", value: 4100000 },
	{ date: "Fri", value: 3800000 },
	{ date: "Sat", value: 2900000 },
	{ date: "Sun", value: 3600000 },
];

/**
 * Seven daily transaction count data points (Mon–Sun).
 *
 * Used by the "Transactions Over Time" AnalyticsChart.
 *
 * @see AnalyticsChart — `src/components/analytics/AnalyticsChart.tsx`
 * @see Analytics_Data_Sources.md — `src/docs/Analytics_Data_Sources.md`
 */
export const transactionsData: ChartDataPoint[] = [
	{ date: "Mon", value: 12000 },
	{ date: "Tue", value: 15600 },
	{ date: "Wed", value: 13400 },
	{ date: "Thu", value: 18900 },
	{ date: "Fri", value: 17200 },
	{ date: "Sat", value: 14800 },
	{ date: "Sun", value: 16331 },
];

/**
 * Top five assets ranked by trading volume.
 *
 * Covers: MUX, XLM, USDC, ETH, BTC.
 *
 * @see TopAssetsTable — `src/components/analytics/TopAssetsTable.tsx`
 * @see Analytics_Data_Sources.md — `src/docs/Analytics_Data_Sources.md`
 */
export const topAssets: AssetData[] = [
	{
		rank: 1,
		name: "Mux Protocol",
		symbol: "MUX",
		volume: "$4,234,567",
		volumeChange: 15.2,
		tvl: "$18.2M",
		txCount: 28432,
	},
	{
		rank: 2,
		name: "Stellar",
		symbol: "XLM",
		volume: "$3,456,789",
		volumeChange: 8.7,
		tvl: "$12.8M",
		txCount: 21890,
	},
	{
		rank: 3,
		name: "USDC",
		symbol: "USDC",
		volume: "$2,345,678",
		volumeChange: -3.1,
		tvl: "$45.6M",
		txCount: 15678,
	},
	{
		rank: 4,
		name: "Ethereum",
		symbol: "ETH",
		volume: "$1,234,567",
		volumeChange: 5.4,
		tvl: "$8.9M",
		txCount: 10234,
	},
	{
		rank: 5,
		name: "Bitcoin",
		symbol: "BTC",
		volume: "$987,654",
		volumeChange: -1.8,
		tvl: "$6.7M",
		txCount: 5678,
	},
];
