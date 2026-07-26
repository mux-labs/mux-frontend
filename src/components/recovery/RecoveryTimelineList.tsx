"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { RecoveryTimelineListProps } from "@/types/recovery";
import { RecoveryTimelineEvent } from "./RecoveryTimelineEvent";

/**
 * RecoveryTimelineList component displays a list of recovery timeline events
 *
 * Features:
 * - Displays events in chronological order
 * - Shows visual timeline with connecting lines
 * - Handles empty state gracefully
 * - Supports event selection callbacks
 * - Responsive design with dark mode support
 * - Accessible with proper ARIA attributes
 *
 * @param events - Array of recovery timeline events to display
 * @param className - Optional additional CSS classes
 * @param onEventClick - Callback when an event is clicked
 * @param emptyMessage - Custom message for empty state
 *
 * @example
 * <RecoveryTimelineList
 *   events={timeline.events}
 *   onEventClick={(event) => console.log(event)}
 * />
 */
export function RecoveryTimelineList({
	events,
	className,
	onEventClick,
	emptyMessage = "No recovery events to display",
}: RecoveryTimelineListProps) {
	const [focusedIndex, setFocusedIndex] = useState<number>(-1);
	const eventRefs = useRef<(HTMLButtonElement | null)[]>([]);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent, index: number) => {
			switch (event.key) {
				case "ArrowDown":
					event.preventDefault();
					if (index < events.length - 1) {
						setFocusedIndex(index + 1);
						eventRefs.current[index + 1]?.focus();
					}
					break;
				case "ArrowUp":
					event.preventDefault();
					if (index > 0) {
						setFocusedIndex(index - 1);
						eventRefs.current[index - 1]?.focus();
					}
					break;
				case "Enter":
				case " ":
					event.preventDefault();
					onEventClick?.(events[index]);
					break;
				case "Home":
					event.preventDefault();
					setFocusedIndex(0);
					eventRefs.current[0]?.focus();
					break;
				case "End":
					event.preventDefault();
					const lastIndex = events.length - 1;
					setFocusedIndex(lastIndex);
					eventRefs.current[lastIndex]?.focus();
					break;
			}
		},
		[events, onEventClick],
	);

	const handleFocus = useCallback((index: number) => {
		setFocusedIndex(index);
	}, []);

	const handleBlur = useCallback(() => {
		setFocusedIndex(-1);
	}, []);

	// Handle empty state
	if (!events || events.length === 0) {
		return (
			<div
				className={cn(
					"rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-4 sm:p-8 text-center",
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
						className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-400 dark:text-zinc-600"
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
		<div className={cn("space-y-4 sm:space-y-6", className)}>
			{/* Progress indicator */}
			<div className="space-y-2">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
					<h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
						Recovery Progress
					</h3>
					<span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
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
						focused={focusedIndex === index}
						tabIndex={focusedIndex === index ? 0 : -1}
						onKeyDown={(e) => handleKeyDown(e, index)}
						eventRef={(el) => { eventRefs.current[index] = el; }}
						onFocus={() => handleFocus(index)}
						onBlur={handleBlur}
						testId={`recovery-event-${index}`}
						className={cn(
							"transition-all",
							onEventClick &&
								"cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50 p-2 rounded",
						)}
					/>
				))}
			</div>

			{/* Summary statistics */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
				<div className="flex sm:flex-col items-center sm:text-center gap-2 sm:gap-0">
					<div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
						{completedCount}
					</div>
					<div className="text-xs text-zinc-600 dark:text-zinc-400 sm:mt-1">
						Completed
					</div>
				</div>

				<div className="flex sm:flex-col items-center sm:text-center gap-2 sm:gap-0">
					<div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">
						{inProgressCount}
					</div>
					<div className="text-xs text-zinc-600 dark:text-zinc-400 sm:mt-1">
						In Progress
					</div>
				</div>

				<div className="flex sm:flex-col items-center sm:text-center gap-2 sm:gap-0">
					<div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
						{failedCount}
					</div>
					<div className="text-xs text-zinc-600 dark:text-zinc-400 sm:mt-1">
						Failed
					</div>
				</div>
			</div>
		</div>
	);
}
