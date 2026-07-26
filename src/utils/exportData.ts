import type {
	AnalyticsSummary,
	ExportFormat,
	Transaction,
} from "@/types/analytics";

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

/** CSV column headers in display order. */
const CSV_HEADERS = [
	"ID",
	"Date",
	"Description",
	"Category",
	"Type",
	"Status",
	"Amount",
	"Currency",
] as const;

/**
 * Escapes a single CSV cell value.
 * Wraps in double-quotes and escapes internal double-quotes per RFC 4180.
 */
export function escapeCsvCell(value: string | number): string {
	const str = String(value);
	// Wrap in quotes if the value contains a comma, newline, or double-quote
	if (str.includes(",") || str.includes("\n") || str.includes('"')) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

/**
 * Converts an array of transactions to a RFC 4180-compliant CSV string.
 * Returns an empty string (header only) when `transactions` is empty.
 */
export function transactionsToCsv(transactions: Transaction[]): string {
	const header = CSV_HEADERS.join(",");

	if (transactions.length === 0) {
		return header;
	}

	const rows = transactions.map((tx) =>
		[
			escapeCsvCell(tx.id),
			escapeCsvCell(tx.date),
			escapeCsvCell(tx.description),
			escapeCsvCell(tx.category),
			escapeCsvCell(tx.type),
			escapeCsvCell(tx.status),
			escapeCsvCell(tx.amount),
			escapeCsvCell(tx.currency),
		].join(","),
	);

	return [header, ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// JSON helpers
// ---------------------------------------------------------------------------

/**
 * Serialises transactions to a pretty-printed JSON string.
 * Returns `"[]"` when `transactions` is empty.
 */
export function transactionsToJson(transactions: Transaction[]): string {
	return JSON.stringify(transactions, null, 2);
}

// ---------------------------------------------------------------------------
// Summary computation
// ---------------------------------------------------------------------------

/**
 * Derives an {@link AnalyticsSummary} from a list of transactions.
 * Safe to call with an empty array — all numeric fields will be 0.
 */
export function computeAnalyticsSummary(
	transactions: Transaction[],
): AnalyticsSummary {
	let totalIncoming = 0;
	let totalOutgoing = 0;
	let completedCount = 0;
	let pendingCount = 0;
	let failedCount = 0;

	for (const tx of transactions) {
		if (tx.type === "incoming") {
			totalIncoming += tx.amount;
		} else {
			totalOutgoing += tx.amount;
		}

		if (tx.status === "completed") completedCount++;
		else if (tx.status === "pending") pendingCount++;
		else if (tx.status === "failed") failedCount++;
	}

	return {
		totalTransactions: transactions.length,
		totalIncoming,
		totalOutgoing,
		completedCount,
		pendingCount,
		failedCount,
	};
}

// ---------------------------------------------------------------------------
// Browser download trigger
// ---------------------------------------------------------------------------

/**
 * Triggers a file download in the browser using a temporary anchor element.
 * This is a side-effectful function — keep it out of pure utility tests.
 *
 * @param content  - The string content to write to the file.
 * @param filename - Suggested filename for the download dialog.
 * @param mimeType - MIME type of the content.
 */
export function triggerDownload(
	content: string,
	filename: string,
	mimeType: string,
): void {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);

	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.style.display = "none";

	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);

	// Release the object URL after a short delay to allow the download to start
	setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ---------------------------------------------------------------------------
// High-level export entry point
// ---------------------------------------------------------------------------

/**
 * Exports the given transactions in the requested format and triggers a
 * browser download.
 *
 * @param transactions - The data to export.
 * @param format       - `"csv"` or `"json"`.
 * @param filenameBase - Base name without extension (default: `"analytics-export"`).
 *
 * @throws {Error} When `transactions` is not a valid array.
 */
export function exportTransactions(
	transactions: Transaction[],
	format: ExportFormat,
	filenameBase = "analytics-export",
): void {
	if (!Array.isArray(transactions)) {
		throw new Error("exportTransactions: transactions must be an array");
	}

	if (format === "csv") {
		const content = transactionsToCsv(transactions);
		triggerDownload(content, `${filenameBase}.csv`, "text/csv;charset=utf-8;");
	} else {
		const content = transactionsToJson(transactions);
		triggerDownload(
			content,
			`${filenameBase}.json`,
			"application/json;charset=utf-8;",
		);
	}
}
