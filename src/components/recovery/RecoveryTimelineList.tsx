"use client";

import { cn } from "@/lib/utils";
import type { RecoveryTimelineListProps } from "@/types/recovery";
import { RecoveryTimelineEvent } from "./RecoveryTimelineEvent";
import { RecoveryTimelineSkeleton } from "@/components/ui/Skeleton";

/**
 * RecoveryTimelineList component displays a list of recovery timeline events
 *
 * Features:
 * - Displays events in chronological order
 * - Shows visual timeline with connecting lines
 * - Handles empty state gracefully
 * - Supports event selection callbacks
 * - Loading state shows skeleton placeholder
 * - Responsive design with dark mode support
 * - Accessible with proper ARIA attributes
 *
 * @param events - Array of recovery timeline events to display
 * @param loading - Show skeleton placeholder when true
 * @param className - Optional additional CSS classes
 * @param onEventClick - Callback when an event is clicked
 * @param emptyMessage - Custom message for empty state
 *
 * @example
 * <RecoveryTimelineList
 *   events={timeline.events}
 *   loading={isLoading}
 *   onEventClick={(event) => console.log(event)}
 * />
 */
export function RecoveryTimelineList({
	events,
	loading = false,
	className,
	onEventClick,
	emptyMessage = "No recovery events to display",
}: RecoveryTimelineListProps) {
	if (loading) {
		return <RecoveryTimelineSkeleton className={className} />;
	}
	// Handle empty state
	if (!events || events.length === 0) {
		return (
			<div
				className={cn(
					"rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center",
					className,
				)}
				role="status"
				aria-label="Empty recovery timeline"
			>
				<div className="flex flex-col items-center gap-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={1.5}
						stroke="currentColor"
						className="w-8 h-8 text-zinc-400 dark:text-zinc-600"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
						/>
					</svg>
					<p className="text-sm text-zinc-600 dark:text-zinc-400">
						{emptyMessage}
					</p>
				</div>
			</div>
		);
	}

	// Calculate statistics
	const completedCount = events.filter((e) => e.status === "completed").length;
	const failedCount = events.filter((e) => e.status === "failed").length;
	const inProgressCount = events.filter(
		(e) => e.status === "in_progress",
	).length;
	const progressPercentage = Math.round((completedCount / events.length) * 100);

	return (
		<div className={cn("space-y-6", className)}>
			{/* Progress indicator */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
						Recovery Progress
					</h3>
					<span className="text-sm text-zinc-600 dark:text-zinc-400">
						{completedCount} of {events.length} completed
					</span>
				</div>

				{/* Progress bar */}
				<div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
					<div
						className={cn(
							"h-full transition-all duration-300",
							failedCount > 0
								? "bg-red-500"
								: inProgressCount > 0
									? "bg-yellow-500"
									: "bg-green-500",
						)}
						style={{ width: `${progressPercentage}%` }}
						role="progressbar"
						aria-valuenow={progressPercentage}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-label="Recovery progress"
					/>
				</div>
			</div>

			{/* Timeline events */}
			<div
				className="space-y-0"
				role="list"
				aria-label="Recovery timeline events"
			>
				{events.map((event, index) => (
					<RecoveryTimelineEvent
						key={event.id}
						event={event}
						isFirst={index === 0}
						isLast={index === events.length - 1}
						onClick={() => onEventClick?.(event)}
						className={cn(
							"transition-all",
							onEventClick &&
								"cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50 p-2 rounded",
						)}
					/>
				))}
			</div>

			{/* Summary statistics */}
			<div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
				<div className="text-center">
					<div className="text-2xl font-bold text-green-600 dark:text-green-400">
						{completedCount}
					</div>
					<div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
						Completed
					</div>
				</div>

				<div className="text-center">
					<div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
						{inProgressCount}
					</div>
					<div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
						In Progress
					</div>
				</div>

				<div className="text-center">
					<div className="text-2xl font-bold text-red-600 dark:text-red-400">
						{failedCount}
					</div>
					<div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
						Failed
					</div>
				</div>
			</div>
		</div>
	);
}
