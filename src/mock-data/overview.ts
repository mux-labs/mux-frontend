/**
 * Local/dev-only mock fixture for dashboard overview stats.
 *
 * The canonical OverviewData type lives in src/types/overview.ts.
 * This file re-exports it for backward compatibility with any import that
 * still references "@/mock-data/overview" for the type, and provides the
 * mock fixture used by /api/overview in non-production environments.
 *
 * Do NOT add production logic here.  Production code must import
 * OverviewData from "@/types/overview".
 */
export type { OverviewData } from "@/types/overview";

import type { OverviewData } from "@/types/overview";

export const mockOverview: OverviewData = {
	totalWallets: 156,
	activeWallets: 142,
	totalTransactions: 2847,
	totalVolumeXlm: "45230.50",
	apiRequestsToday: 1284,
	lastUpdated: "2026-07-27T10:00:00.000Z",
};
