import { GET } from "@/app/api/activity/route";
import { describe, expect, it } from "vitest";

describe("GET /api/activity", () => {
	it("returns dashboard activity items in a data envelope", async () => {
		const res = await GET();
		const json = await res.json();

		expect(Array.isArray(json.data)).toBe(true);
		expect(json.data[0]).toMatchObject({
			type: "wallet_created",
			status: "success",
			network: "mainnet",
		});
	});
});
