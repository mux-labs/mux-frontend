"use client";

import { useState } from "react";
import { AnalyticsChart } from "@/components/analytics/AnalyticsChart";
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
	const { track } = useAnalyticsTracking("analytics");
	const { toasts, addToast, dismissToast } = useToast();

	// #453 – analytics export stub: wire the export hook to the page so
	// developers can download transaction data as CSV or JSON.
	const transactions = data?.topAssets
		? // Convert TopAssetsTable rows to Transaction shape for export.
			// When a real transactions endpoint is available, replace this with
			// a dedicated useTransactions(range) hook.
			data.topAssets.map((asset, i) => ({
				id: `asset-${i}`,
				description: asset.name,
				date: range.to,
				humanDate: range.to,
				category: asset.symbol,
				status: "completed" as const,
				amount: asset.txCount,
				currency: asset.symbol,
				type: "outgoing" as const,
			}))
		: [];

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
