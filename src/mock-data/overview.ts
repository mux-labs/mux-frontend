export interface OverviewData {
	totalWallets: number;
	activeWallets: number;
	totalTransactions: number;
	totalVolumeXlm: string;
	apiRequestsToday: number;
	lastUpdated: string;
}

export const mockOverview: OverviewData = {
	totalWallets: 156,
	activeWallets: 142,
	totalTransactions: 2847,
	totalVolumeXlm: "45230.50",
	apiRequestsToday: 1284,
	lastUpdated: "2026-07-27T10:00:00.000Z",
};
