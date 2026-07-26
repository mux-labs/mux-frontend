"use client";

import { RefreshCw } from "lucide-react";
import type { DateRange } from "./DateRangePicker";
import { DateRangePicker } from "./DateRangePicker";
import { Button } from "@/components/ui/button";

export type { DateRange };

interface AnalyticsHeaderProps {
	/** Currently selected date range. */
	range: DateRange;
	/** Called when the user picks a new range. */
	onRangeChange: (range: DateRange) => void;
	/** Optional callback to refresh analytics data. */
	onRefresh?: () => void;
}

export function AnalyticsHeader({
	range,
	onRangeChange,
	onRefresh,
}: AnalyticsHeaderProps) {
	return (
		<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
					Analytics
				</h1>
				<p className="mt-1 text-zinc-500 dark:text-zinc-400">
					Comprehensive overview of platform metrics, volumes, and trends
				</p>
			</div>

			<div className="flex items-center gap-2">
				{onRefresh && (
					<Button
						variant="outline"
						size="sm"
						onClick={onRefresh}
						className="gap-2"
						aria-label="Refresh analytics data"
					>
						<RefreshCw className="h-4 w-4" />
						Refresh
					</Button>
				)}
				<DateRangePicker value={range} onChange={onRangeChange} />
			</div>
		</header>
	);
}
