import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/overview/route";

describe("GET /api/overview", () => {
	it("returns overview payload with projects count", async () => {
		const res = await GET();
		const json = await res.json();

		expect(json).toEqual({ data: { projects: 0 } });
	});
});
