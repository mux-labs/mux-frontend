import type { Transaction } from "@/types/transaction";

/**
 * Derive "today's usage" for the spending-limits UI from real activity
 * rather than a hardcoded constant.
 *
 * Usage is the sum of `amountXlm` across every **completed** transaction
 * that settled on the most recent calendar day (UTC) present in the data.
 * Pending and failed transactions do not count against a spending limit,
 * and days other than the latest one belong to a previous period.
 *
 * The production `/api/spending-limits` route gets this number straight
 * from `mux-backend`; this helper is what the demo route
 * (`/api/demo/spending-limits`) uses so its number tracks the mock
 * transaction store instead of always reporting the same figure.
 */
export function computeTodayUsage(
	transactions: readonly Transaction[],
): number {
	const completed = transactions.filter((tx) => tx.status === "completed");
	if (completed.length === 0) return 0;

	const dayOf = (tx: Transaction) => tx.createdAt.slice(0, 10);
	const latestDay = completed
		.map(dayOf)
		.reduce((latest, day) => (day > latest ? day : latest));

	return completed
		.filter((tx) => dayOf(tx) === latestDay)
		.reduce((total, tx) => total + Number.parseFloat(tx.amountXlm), 0);
}
