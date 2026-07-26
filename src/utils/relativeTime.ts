/**
 * Formats a timestamp as a short relative string ("5m ago", "2h ago") and
 * exposes the absolute ISO string for use as a tooltip/title.
 */
export function formatRelativeTime(input: Date | string | number): string {
	const date = input instanceof Date ? input : new Date(input);
	const diffMs = Date.now() - date.getTime();
	const diffSec = Math.round(diffMs / 1000);

	if (diffSec < 5) return "just now";
	if (diffSec < 60) return `${diffSec}s ago`;

	const diffMin = Math.round(diffSec / 60);
	if (diffMin < 60) return `${diffMin}m ago`;

	const diffHour = Math.round(diffMin / 60);
	if (diffHour < 24) return `${diffHour}h ago`;

	const diffDay = Math.round(diffHour / 24);
	if (diffDay < 30) return `${diffDay}d ago`;

	const diffMonth = Math.round(diffDay / 30);
	if (diffMonth < 12) return `${diffMonth}mo ago`;

	const diffYear = Math.round(diffMonth / 12);
	return `${diffYear}y ago`;
}

/** Absolute, human-readable timestamp suitable for a title/tooltip attribute. */
export function formatAbsoluteTime(input: Date | string | number): string {
	const date = input instanceof Date ? input : new Date(input);
	return date.toISOString().replace("T", " ").replace("Z", " UTC");
}
