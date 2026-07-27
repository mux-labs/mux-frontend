"use client";

import { RefreshCw } from "lucide-react";
import type { DateRange } from "./DateRangePicker";
import { DateRangePicker } from "./DateRangePicker";
import { PageHeader } from "@/components/ui/PageHeader";
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
		<PageHeader
			title="Analytics"
			description="Comprehensive overview of platform metrics, volumes, and trends"
			actions={
				<>
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
				</>
			}
		/>
	);
}
