import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/overview/route";

describe("GET /api/overview", () => {
	it("returns overview metric payload", async () => {
		const res = await GET();
		const json = await res.json();

		expect(json.data).toMatchObject({
			totalWallets: 156,
			activeWallets: 142,
			totalTransactions: 2847,
			totalVolumeXlm: "45230.50",
			apiRequestsToday: 1284,
		});
	});
});
