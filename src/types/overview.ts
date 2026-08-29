/**
 * Canonical type for the dashboard overview response.
 *
 * Lives here (not in src/mock-data/) so production code and the live
 * backend response shape both reference the same contract.  The mock
 * fixture in src/mock-data/overview.ts imports and re-uses this type so
 * there is a single source of truth (#706).
 */
export interface OverviewData {
	totalWallets: number;
	activeWallets: number;
	totalTransactions: number;
	/** XLM volume as a decimal string, e.g. "45230.50". */
	totalVolumeXlm: string;
	apiRequestsToday: number;
	/** ISO 8601 timestamp string, e.g. "2026-08-28T10:00:00.000Z". */
	lastUpdated: string;
}
