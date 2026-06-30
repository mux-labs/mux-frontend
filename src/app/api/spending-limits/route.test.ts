import { beforeEach, describe, expect, it, vi } from "vitest";

describe("/api/spending-limits", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	async function loadRoute() {
		return import("./route");
	}

	it("returns the current limits and usage", async () => {
		const { GET } = await loadRoute();
		const response = await GET();

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			limits: { dailyLimit: 5000, transactionLimit: 1000 },
			todayUsage: 750,
		});
	});

	it("persists a valid update and returns the updated payload", async () => {
		const { GET, PUT } = await loadRoute();
		const request = new Request("http://localhost/api/spending-limits", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				dailyLimit: 8000,
				transactionLimit: 2000,
			}),
		});

		const putResponse = await PUT(request);
		expect(putResponse.status).toBe(200);
		await expect(putResponse.json()).resolves.toEqual({
			limits: { dailyLimit: 8000, transactionLimit: 2000 },
			todayUsage: 750,
		});

		const getResponse = await GET();
		await expect(getResponse.json()).resolves.toEqual({
			limits: { dailyLimit: 8000, transactionLimit: 2000 },
			todayUsage: 750,
		});
	});

	it("rejects malformed or missing payloads", async () => {
		const { PUT } = await loadRoute();

		const missingFieldResponse = await PUT(
			new Request("http://localhost/api/spending-limits", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ dailyLimit: 1000 }),
			}),
		);
		expect(missingFieldResponse.status).toBe(400);
		await expect(missingFieldResponse.json()).resolves.toEqual({
			error: "Missing required fields: dailyLimit, transactionLimit",
		});

		const invalidTypeResponse = await PUT(
			new Request("http://localhost/api/spending-limits", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					dailyLimit: "1000",
					transactionLimit: 1000,
				}),
			}),
		);
		expect(invalidTypeResponse.status).toBe(400);

		const invalidJsonResponse = await PUT(
			{
				json: async () => {
					throw new Error("Unexpected token");
				},
			} as unknown as Request,
		);
		expect(invalidJsonResponse.status).toBe(400);
	});
});
