/**
 * Analytics domain types for Mux Protocol.
 * Shared between the analytics page, mock data, and export utilities.
 */

export type TransactionStatus = "completed" | "pending" | "failed";
export type TransactionType = "incoming" | "outgoing";

export interface Transaction {
	id: string;
	description: string;
	/** ISO date string, e.g. "2023-10-24" */
	date: string;
	/** Human-readable date, e.g. "Oct 24, 2023" */
	humanDate: string;
	category: string;
	status: TransactionStatus;
	amount: number;
	currency: string;
	type: TransactionType;
}

/** Summary metrics derived from a set of transactions. */
export interface AnalyticsSummary {
	totalTransactions: number;
	totalIncoming: number;
	totalOutgoing: number;
	completedCount: number;
	pendingCount: number;
	failedCount: number;
}

/** Supported export formats. */
export type ExportFormat = "csv" | "json";

/** State machine for the export operation. */
export type ExportStatus = "idle" | "exporting" | "success" | "error";

// ---------------------------------------------------------------------------
// Analytics dashboard response shapes
// ---------------------------------------------------------------------------
//
// Shared between the production analytics service (src/services/
// analyticsService.ts), mock data (src/mock-data/analytics.ts), and the
// analytics dashboard components. Keeping these here (rather than in
// mock-data) means the production service does not depend on mock-only
// modules for its types.

/**
 * A single KPI metric card shown in the MetricsCards grid.
 *
 * `value` is pre-formatted for display (e.g. `"$12.4M"`) so components do not
 * need to perform currency formatting themselves.
 */
export interface Metric {
	/** Display name shown above the value, e.g. "Total Volume". */
	label: string;
	/** Pre-formatted display value, e.g. "$12.4M" or "84,231". */
	value: string;
	/** Percentage change vs the previous period. Negative values indicate a decrease. */
	change: number;
	/** Context label shown next to the change badge, e.g. "vs last period". */
	changeLabel: string;
}

/**
 * A single data point for a bar or line chart.
 *
 * `date` is used as the X-axis label and can be a short day name ("Mon") or
 * an ISO date string ("2024-01-01") depending on the time range.
 */
export interface ChartDataPoint {
	/** X-axis label, e.g. "Mon" or "2024-01-01". */
	date: string;
	/** Raw numeric value used to compute bar height or line position. */
	value: number;
}

/**
 * A single row in the TopAssetsTable.
 *
 * `volume` and `tvl` are pre-formatted strings (e.g. `"$4,234,567"`) so the
 * table component does not need to perform currency formatting.
 */
export interface AssetData {
	/** 1-based ranking position. */
	rank: number;
	/** Full asset name, e.g. "Mux Protocol". */
	name: string;
	/** Ticker symbol, e.g. "MUX". */
	symbol: string;
	/** Pre-formatted trading volume string, e.g. "$4,234,567". */
	volume: string;
	/** Percentage volume change vs the previous period. Negative = decrease. */
	volumeChange: number;
	/** Pre-formatted total value locked string, e.g. "$18.2M". */
	tvl: string;
	/** Raw transaction count for the period. */
	txCount: number;
}
