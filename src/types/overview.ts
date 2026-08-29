/**
 * Shape of the dashboard overview stats returned by `GET /api/overview`.
 *
 * Kept separate from `src/mock-data/overview.ts` so components and the API
 * client type against the real (backend-shaped) contract, not the mock
 * fixture — a live `mux-backend` response must satisfy this interface on
 * its own merits, independent of what the mock happens to return.
 */
export interface OverviewData {
	totalWallets: number;
	activeWallets: number;
	totalTransactions: number;
	totalVolumeXlm: string;
	apiRequestsToday: number;
	lastUpdated: string;
}
