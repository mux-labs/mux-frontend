"use client";

import { useState } from "react";
import { AnalyticsChart } from "@/components/analytics/AnalyticsChart";
import { AnalyticsEmptyState } from "@/components/analytics/AnalyticsEmptyState";
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

	async function handleRefresh() {
		try {
			refetch();
			addToast({
				type: "success",
				message: "Analytics data refreshed",
				description: "Dashboard has been updated with the latest data",
				duration: 3000,
			});
		} catch (err) {
			addToast({
				type: "error",
				message: "Failed to refresh data",
				description:
					err instanceof Error ? err.message : "Please try again later",
				duration: 5000,
			});
		}
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

				<AnalyticsHeader
					range={range}
					onRangeChange={handleRangeChange}
					onRefresh={handleRefresh}
				/>

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
