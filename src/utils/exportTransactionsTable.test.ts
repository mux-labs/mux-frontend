import { describe, expect, it } from "vitest";
import type { Transaction } from "@/types/transaction";
import { transactionsTableToCsv } from "./exportTransactionsTable";

const completed: Transaction = {
	hash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
	from: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
	to: "GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
	amountXlm: "250.0000000",
	memo: "payment-ref-001",
	ledger: 1000,
	fee: "0.0000100",
	network: "mainnet",
	status: "completed",
	createdAt: "2025-05-28T14:22:00Z",
};

const pending: Transaction = {
	hash: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
	from: "GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
	to: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOBER7KKQOAVSMIA",
	amountXlm: "1000.0000000",
	ledger: 999,
	fee: "0.0000100",
	network: "testnet",
	status: "pending",
	createdAt: "2025-05-27T09:45:00Z",
};

const withCommaMemo: Transaction = {
	...completed,
	hash: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
	memo: "thanks, again",
};

const withQuoteMemo: Transaction = {
	...completed,
	hash: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
	memo: 'He said "hi"',
};

describe("transactionsTableToCsv", () => {
	it("returns only the header row for an empty array", () => {
		expect(transactionsTableToCsv([])).toBe(
			"Hash,From,To,Amount (XLM),Fee (XLM),Status,Network,Memo,Ledger,Created At",
		);
	});

	it("produces the correct number of lines (header + one per transaction)", () => {
		const lines = transactionsTableToCsv([completed, pending]).split("\n");
		expect(lines).toHaveLength(3);
	});

	it("maps transaction fields to the correct columns", () => {
		const dataRow = transactionsTableToCsv([completed]).split("\n")[1];
		expect(dataRow).toContain(completed.hash);
		expect(dataRow).toContain(completed.from);
		expect(dataRow).toContain(completed.to);
		expect(dataRow).toContain(completed.amountXlm);
		expect(dataRow).toContain(completed.fee);
		expect(dataRow).toContain("completed");
		expect(dataRow).toContain("mainnet");
		expect(dataRow).toContain("payment-ref-001");
		expect(dataRow).toContain("1000");
	});

	it("renders an empty memo cell when memo is absent", () => {
		const dataRow = transactionsTableToCsv([pending]).split("\n")[1];
		const cells = dataRow.split(",");
		// Memo is the 8th column (index 7)
		expect(cells[7]).toBe("");
	});

	it("wraps memo values containing commas in double-quotes", () => {
		const result = transactionsTableToCsv([withCommaMemo]);
		expect(result).toContain('"thanks, again"');
	});

	it("escapes double-quotes inside memo values per RFC 4180", () => {
		const result = transactionsTableToCsv([withQuoteMemo]);
		expect(result).toContain('"He said ""hi"""');
	});

	it("handles a large dataset without throwing", () => {
		const many: Transaction[] = Array.from({ length: 500 }, (_, i) => ({
			...completed,
			hash: `hash-${i}`,
		}));
		expect(() => transactionsTableToCsv(many)).not.toThrow();
		expect(transactionsTableToCsv(many).split("\n")).toHaveLength(501);
	});
});
