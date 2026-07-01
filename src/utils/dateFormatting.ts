/**
 * Formats a Date object to a readable string.
 * Example: new Date("2024-01-15") -> "Jan 15, 2024"
 */
export function formatDate(date: Date | undefined): string {
	if (!date) return "—";
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
}
