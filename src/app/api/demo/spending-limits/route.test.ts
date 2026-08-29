import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeTodayUsage } from "@/lib/spending-limits/todayUsage";
import { mockTransactions } from "@/mock-data/transactions";
import { GET, PUT } from "./route";

const expectedUsage = computeTodayUsage(mockTransactions);

describe("/api/demo/spending-limits", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("keeps mock persistence isolated to the demo route", async () => {
		const update = await PUT(
			new Request("http://localhost/api/demo/spending-limits", {
				method: "PUT",
				body: JSON.stringify({ dailyLimit: 8000, transactionLimit: 2000 }),
			}),
		);
		expect(update.status).toBe(200);

		const response = await GET();
		await expect(response.json()).resolves.toEqual({
			limits: { dailyLimit: 8000, transactionLimit: 2000 },
			todayUsage: expectedUsage,
		});
	});

	it("derives todayUsage from mock activity, not a fixed constant", async () => {
		const response = await GET();
		const body = (await response.json()) as { todayUsage: number };

		// Regression guard for #648: the route used to always return 750.
		expect(body.todayUsage).toBe(expectedUsage);
		expect(body.todayUsage).not.toBe(750);
	});
});
