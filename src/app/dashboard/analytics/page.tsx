"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AnalyticsEmptyState } from "@/components/analytics/AnalyticsEmptyState";
import { AnalyticsExportButton } from "@/components/analytics/AnalyticsExportButton";
import {
	AnalyticsHeader,
	type DateRange,
} from "@/components/analytics/AnalyticsHeader";
import { AnalyticsHelpPanel } from "@/components/analytics/AnalyticsHelpPanel";
import { AnalyticsLoadingSkeleton } from "@/components/analytics/AnalyticsLoadingSkeleton";
import { MetricsCards } from "@/components/analytics/MetricsCards";
import { TopAssetsTable } from "@/components/analytics/TopAssetsTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { ToastContainer, useToast } from "@/components/ui/toast";
import { useAnalyticsExport } from "@/hooks/useAnalyticsExport";
import { useAnalyticsMetrics } from "@/hooks/useAnalyticsMetrics";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import { useAnalyticsTransactions } from "@/hooks/useAnalyticsTransactions";

// ---------------------------------------------------------------------------
// Lazy-loaded chart components — reduces the initial JS bundle for the
// analytics route.  `ssr: false` because the chart SVGs read `document` for
// dark-mode detection and don't need server-side rendering.
// ---------------------------------------------------------------------------

const AnalyticsChart = dynamic(
	() =>
		import("@/components/analytics/AnalyticsChart").then(
			(mod) => mod.AnalyticsChart,
		),
	{
		ssr: false,
		loading: () => (
			<div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
				<div className="mb-6 h-6 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
				<div className="h-[120px] animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
			</div>
		),
	},
);

// ---------------------------------------------------------------------------
// Analytics page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
	const [range, setRange] = useState<DateRange>(() => {
		const to = new Date();
		const from = new Date();
		from.setDate(from.getDate() - 7);
		return {
			from: from.toISOString().slice(0, 10),
			to: to.toISOString().slice(0, 10),
		};
	});

	const { data, isLoading, isEmpty, isError, error, refetch } =
		useAnalyticsMetrics(range);
	// #453 – real export data: the analytics export is backed by genuine,
	// date-scoped transaction records (GET /analytics/transactions-list) via
	// useAnalyticsTransactions, not synthetic objects derived from the
	// aggregated topAssets table.
	const { transactions } = useAnalyticsTransactions(range);
	const { track } = useAnalyticsTracking("analytics");
	const { toasts, addToast, dismissToast } = useToast();

	const {
		status: exportStatus,
		errorMessage: exportError,
		exportAs,
		reset: resetExport,
	} = useAnalyticsExport({
		transactions,
		filenameBase: `analytics-${range.from}_${range.to}`,
	});

	function handleRangeChange(newRange: DateRange) {
		setRange(newRange);
		track("date_range_changed", { from: newRange.from, to: newRange.to });

		addToast({
			type: "info",
			message: "Date range updated",
			description: `Showing data from ${newRange.from} to ${newRange.to}`,
			duration: 3000,
		});
	}

	function handleRefresh() {
		refetch();
		addToast({
			type: "success",
			message: "Refreshing analytics data",
			description: "Dashboard is being updated with the latest data",
			duration: 3000,
		});
	}

	if (isLoading) {
		return <AnalyticsLoadingSkeleton />;
	}

	if (isError) {
		return (
			<>
				<ErrorState
					title="Failed to load analytics"
					description={
						error ?? "An unexpected error occurred. Please try again."
					}
					retry={{ onRetry: handleRefresh }}
				/>
				<ToastContainer
					toasts={toasts}
					onDismiss={dismissToast}
					position="top-right"
				/>
			</>
		);
	}

	if (isEmpty || !data) {
		return (
			<div className="space-y-6">
				<AnalyticsHeader range={range} onRangeChange={handleRangeChange} />
				<AnalyticsEmptyState
					action={{
						label: "Refresh",
						onClick: refetch,
					}}
				/>
				<ToastContainer
					toasts={toasts}
					onDismiss={dismissToast}
					position="top-right"
				/>
			</div>
		);
	}

	return (
		<>
			<div className="space-y-6">
				{/* #454 – inline help panel documents analytics data sources */}
				<AnalyticsHelpPanel />

				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
					<AnalyticsHeader
						range={range}
						onRangeChange={handleRangeChange}
						onRefresh={handleRefresh}
					/>

					{/* #453 – export control: lets developers download the current
					    analytics snapshot as CSV or JSON */}
					<div className="shrink-0">
						<AnalyticsExportButton
							status={exportStatus}
							errorMessage={exportError}
							onExport={exportAs}
							onReset={resetExport}
							rowCount={transactions.length}
						/>
					</div>
				</div>

				<MetricsCards metrics={data.metrics} />

				<div className="grid gap-6 lg:grid-cols-2">
					<AnalyticsChart
						title="Volume"
						description="Total transaction volume over the selected period"
						data={data.volumeData}
						formatValue={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
					/>
					<AnalyticsChart
						title="Transactions"
						description="Number of transactions over the selected period"
						data={data.transactionsData}
					/>
				</div>

				<TopAssetsTable assets={data.topAssets} />
			</div>

			<ToastContainer
				toasts={toasts}
				onDismiss={dismissToast}
				position="top-right"
			/>
		</>
	);
}
