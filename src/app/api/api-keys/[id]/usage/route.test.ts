import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/api-keys/[id]/usage/route";

function paramsFor(id: string) {
	return { params: { id } };
}

describe("GET /api/api-keys/[id]/usage", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("returns deterministic mock usage analytics for a key", async () => {
		const res = await GET(
			new Request("http://localhost/api/api-keys/1/usage"),
			paramsFor("1"),
		);
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.data).toEqual(
			expect.objectContaining({
				apiKeyId: "1",
				totalRequests: expect.any(Number),
				requestsLast24h: expect.any(Number),
				dailyRequests: expect.any(Array),
			}),
		);
		expect(json.data.dailyRequests).toHaveLength(14);
	});

	it("returns the same totals for the same key id (stable mock data)", async () => {
		const first = await GET(
			new Request("http://localhost/api/api-keys/2/usage"),
			paramsFor("2"),
		);
		const second = await GET(
			new Request("http://localhost/api/api-keys/2/usage"),
			paramsFor("2"),
		);

		const firstJson = await first.json();
		const secondJson = await second.json();

		expect(firstJson.data.dailyRequests).toEqual(secondJson.data.dailyRequests);
	});

	it("rejects a blank id", async () => {
		const res = await GET(
			new Request("http://localhost/api/api-keys/%20/usage"),
			paramsFor("  "),
		);
		expect(res.status).toBe(400);
	});

	it("returns 503 instead of mock data when no backend is configured in production", async () => {
		vi.stubEnv("NODE_ENV", "production");

		const res = await GET(
			new Request("http://localhost/api/api-keys/1/usage"),
			paramsFor("1"),
		);
		const json = await res.json();

		expect(res.status).toBe(503);
		expect(json.error).toBe("backend_unavailable");
	});
});
