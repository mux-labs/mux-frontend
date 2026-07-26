import type { Transaction } from "@/types/transaction";
import { escapeCsvCell, triggerDownload } from "@/utils/exportData";

/** CSV column headers in display order. */
const CSV_HEADERS = [
	"Hash",
	"From",
	"To",
	"Amount (XLM)",
	"Fee (XLM)",
	"Status",
	"Network",
	"Memo",
	"Ledger",
	"Created At",
] as const;

/**
 * Converts an array of Stellar transactions (transactions-table shape) to an
 * RFC 4180-compliant CSV string. Returns the header-only row when
 * `transactions` is empty.
 */
export function transactionsTableToCsv(transactions: Transaction[]): string {
	const header = CSV_HEADERS.join(",");

	if (transactions.length === 0) {
		return header;
	}

	const rows = transactions.map((tx) =>
		[
			escapeCsvCell(tx.hash),
			escapeCsvCell(tx.from),
			escapeCsvCell(tx.to),
			escapeCsvCell(tx.amountXlm),
			escapeCsvCell(tx.fee),
			escapeCsvCell(tx.status),
			escapeCsvCell(tx.network),
			escapeCsvCell(tx.memo ?? ""),
			escapeCsvCell(tx.ledger),
			escapeCsvCell(tx.createdAt),
		].join(","),
	);

	return [header, ...rows].join("\n");
}

/**
 * Serialises the given transactions to CSV and triggers a browser download.
 */
export function downloadTransactionsCsv(
	transactions: Transaction[],
	filenameBase = "transactions",
): void {
	const content = transactionsTableToCsv(transactions);
	triggerDownload(content, `${filenameBase}.csv`, "text/csv;charset=utf-8;");
}
