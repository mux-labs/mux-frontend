import type { OverviewData } from "@/types/overview";

/** Re-exported for backward compatibility; the canonical type now lives in `@/types/overview`. */
export type { OverviewData };

export const mockOverview: OverviewData = {
	totalWallets: 156,
	activeWallets: 142,
	totalTransactions: 2847,
	totalVolumeXlm: "45230.50",
	apiRequestsToday: 1284,
	lastUpdated: "2026-07-27T10:00:00.000Z",
};
