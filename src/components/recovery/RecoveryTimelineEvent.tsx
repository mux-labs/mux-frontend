"use client";

import { cn } from "@/lib/utils";
import type { RecoveryTimelineEventProps } from "@/types/recovery";

const eventTypeIcons: Record<string, React.ReactNode> = {
	initiated: (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={2}
			stroke="currentColor"
			className="w-5 h-5"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M5.636 5.636a9 9 0 1012.728 0M12 3v9m4.243-4.243l-6.364 6.364"
			/>
		</svg>
	),
	detection: (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={2}
			stroke="currentColor"
			className="w-5 h-5"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M9 12l2.25 2.25L15 9m-10.5 6a9 9 0 1118 0 9 9 0 01-18 0z"
			/>
		</svg>
	),
	verification: (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={2}
			stroke="currentColor"
			className="w-5 h-5"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
	),
	processing: (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={2}
			stroke="currentColor"
			className="w-5 h-5 animate-spin"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
			/>
		</svg>
	),
	completion: (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={2}
			stroke="currentColor"
			className="w-5 h-5"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
	),
	error: (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={2}
			stroke="currentColor"
			className="w-5 h-5"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0Zm-9 3.75h.008v.008H12v-.008Z"
			/>
		</svg>
	),
};

const statusColors: Record<string, string> = {
	completed:
		"text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
	in_progress:
		"text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 animate-pulse",
	pending: "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800",
	failed: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
};

const dotColors: Record<string, string> = {
	completed: "bg-green-500",
	in_progress: "bg-yellow-500 animate-pulse",
	pending: "bg-zinc-400 dark:bg-zinc-500",
	failed: "bg-red-500",
};

/**
 * RecoveryTimelineEvent component displays a single event in the recovery timeline
 *
 * Features:
 * - Shows event status with visual indicators
 * - Displays event title, description, and timestamp
 * - Supports optional details and error messages
 * - Clickable for event selection
 * - Accessible with proper ARIA attributes
 * - Responsive design with dark mode support
 *
 * @param event - The recovery timeline event to display
 * @param isLast - Whether this is the last event in the timeline
 * @param isFirst - Whether this is the first event in the timeline
 * @param onClick - Callback when event is clicked
 * @param className - Optional additional CSS classes
 */
export function RecoveryTimelineEvent({
	event,
	isLast = false,
	isFirst = false,
	onClick,
	className,
	focused = false,
	tabIndex = -1,
	onKeyDown,
	eventRef,
	testId,
	onFocus,
	onBlur,
}: RecoveryTimelineEventProps) {
	const statusColor = statusColors[event.status] || statusColors.pending;
	const dotColor = dotColors[event.status] || dotColors.pending;
	const icon = eventTypeIcons[event.type] || eventTypeIcons.initiated;

	return (
		<div
			className={cn("flex gap-2 sm:gap-4", className)}
			role="listitem"
			aria-label={`${event.title} - ${event.status}`}
		>
			{/* Timeline dot and line */}
			<div className="flex flex-col items-center">
				{/* Dot */}
				<button
					ref={eventRef}
					onClick={onClick}
					onKeyDown={onKeyDown}
					onFocus={onFocus}
					onBlur={onBlur}
					tabIndex={tabIndex}
					className={cn(
						"p-2 rounded-full transition-all focus-visible:outline-none",
						statusColor,
						onClick && "cursor-pointer hover:scale-110",
						focused &&
							"ring-2 ring-blue-500 ring-offset-2 dark:ring-blue-400 dark:ring-offset-zinc-900",
					)}
					aria-pressed={false}
					title={event.title}
					data-testid={testId}
				>
					{icon}
				</button>

				{/* Connecting line */}
				{!isLast && (
					<div
						className={cn(
							"w-0.5 sm:w-1 flex-1 my-1 sm:my-2",
							event.status === "completed"
								? "bg-green-300 dark:bg-green-700"
								: event.status === "failed"
									? "bg-red-300 dark:bg-red-700"
									: "bg-zinc-300 dark:bg-zinc-600",
						)}
					/>
				)}
			</div>

			{/* Event content */}
			<div className="flex-1 pb-2 sm:pb-4">
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
					<div className="flex-1">
						<h4 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50">
							{event.title}
						</h4>
						<p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5 sm:mt-1">
							{event.description}
						</p>

						{/* Details section */}
						{event.details && (
							<p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 sm:mt-2 italic">
								{event.details}
							</p>
						)}

						{/* Error message */}
						{event.errorMessage && (
							<div className="mt-1 sm:mt-2 p-1.5 sm:p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-400">
								{event.errorMessage}
							</div>
						)}
					</div>

					{/* Timestamp */}
					<div className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap sm:shrink-0">
						{event.timestamp.toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
