import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/api-keys/route";
import { mockApiKeys } from "@/mock-data/api-keys";

describe("GET /api/api-keys", () => {
	it("returns a list of API keys", async () => {
		const res = await GET();
		const json = await res.json();

		expect(json).toEqual({ data: mockApiKeys });
	});
});
