"use client";

import { formatAbsoluteTime, formatRelativeTime } from "@/utils/relativeTime";

interface RelativeTimestampProps {
	date: Date | string | number;
	className?: string;
}

/**
 * Renders a relative time string ("5m ago") with the absolute timestamp
 * wired up as a `title` tooltip for accessibility and precision.
 */
export function RelativeTimestamp({ date, className }: RelativeTimestampProps) {
	return (
		<time
			dateTime={new Date(date).toISOString()}
			title={formatAbsoluteTime(date)}
			className={className}
		>
			{formatRelativeTime(date)}
		</time>
	);
}
