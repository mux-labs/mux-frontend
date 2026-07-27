import { NextResponse } from "next/server";
import { mockTransactions } from "@/mock-data/transactions";
import type { Transaction } from "@/types/transaction";

/**
 * Transform mock transaction data into activity items expected by RecentActivityFeed.
 * This is a lightweight mapping; in a real implementation the backend would provide
 * appropriately shaped data.
 */
function mapTransactionToActivity(tx: Transaction) {
	// Determine activity type based on transaction status and direction (simplified)
	const type =
		tx.from === "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI"
			? "wallet_created"
			: "transaction";

	return {
		id: tx.hash,
		type,
		description: `${tx.from.slice(0, 4)} → ${tx.to.slice(0, 4)}: ${tx.amountXlm} XLM`,
		timestamp: tx.createdAt,
		network: tx.network,
		status:
			tx.status === "completed"
				? "success"
				: tx.status === "pending"
					? "pending"
					: "error",
	};
}

export async function GET() {
	// Map mock transactions to activity items
	const activities = mockTransactions.map(mapTransactionToActivity);

	return NextResponse.json({ data: activities });
}
