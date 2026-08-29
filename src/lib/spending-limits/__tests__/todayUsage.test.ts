import { describe, expect, it } from "vitest";
import type { Transaction } from "@/types/transaction";
import { computeTodayUsage } from "../todayUsage";

function tx(overrides: Partial<Transaction>): Transaction {
	return {
		hash: "h",
		from: "GA",
		to: "GB",
		amountXlm: "0.0000000",
		ledger: 1,
		fee: "0.0000100",
		network: "mainnet",
		status: "completed",
		createdAt: "2025-05-28T12:00:00Z",
		...overrides,
	};
}

describe("computeTodayUsage", () => {
	it("returns 0 when there are no transactions", () => {
		expect(computeTodayUsage([])).toBe(0);
	});

	it("returns 0 when nothing has completed", () => {
		expect(
			computeTodayUsage([
				tx({ status: "pending", amountXlm: "100.0000000" }),
				tx({ status: "failed", amountXlm: "200.0000000" }),
			]),
		).toBe(0);
	});

	it("sums completed transaction amounts on the latest day only", () => {
		expect(
			computeTodayUsage([
				tx({ amountXlm: "250.0000000", createdAt: "2025-05-28T14:22:00Z" }),
				tx({ amountXlm: "10.5000000", createdAt: "2025-05-28T09:00:00Z" }),
				tx({ amountXlm: "999.0000000", createdAt: "2025-05-27T23:59:00Z" }),
			]),
		).toBe(260.5);
	});

	it("ignores pending and failed transactions on the latest day", () => {
		expect(
			computeTodayUsage([
				tx({ amountXlm: "100.0000000", createdAt: "2025-05-28T10:00:00Z" }),
				tx({
					status: "pending",
					amountXlm: "50.0000000",
					createdAt: "2025-05-28T11:00:00Z",
				}),
				tx({
					status: "failed",
					amountXlm: "70.0000000",
					createdAt: "2025-05-28T12:00:00Z",
				}),
			]),
		).toBe(100);
	});

	it("picks the latest day even when the input is unsorted", () => {
		expect(
			computeTodayUsage([
				tx({ amountXlm: "5.0000000", createdAt: "2025-05-20T10:00:00Z" }),
				tx({ amountXlm: "40.0000000", createdAt: "2025-06-01T10:00:00Z" }),
				tx({ amountXlm: "9.0000000", createdAt: "2025-05-25T10:00:00Z" }),
			]),
		).toBe(40);
	});
});
