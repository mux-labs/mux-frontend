import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT } from "./route";

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
			todayUsage: 750,
		});
	});
});