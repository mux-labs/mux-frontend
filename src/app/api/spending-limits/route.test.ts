import { beforeEach, describe, expect, it, vi } from "vitest";

const { getBackendApiBaseUrl, getServerApiKey } = vi.hoisted(() => ({
	getBackendApiBaseUrl: vi.fn(() => "https://backend.example"),
	getServerApiKey: vi.fn(() => "server-api-key"),
}));

vi.mock("@/lib/api/config", () => ({ getBackendApiBaseUrl, getServerApiKey }));

describe("/api/spending-limits", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getBackendApiBaseUrl.mockReturnValue("https://backend.example");
		vi.stubGlobal("fetch", vi.fn());
	});

	it("returns the current limits and usage", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(
				JSON.stringify({
					limits: { dailyLimit: 5000, transactionLimit: 1000 },
					todayUsage: 750,
				}),
				{ status: 200 },
			),
		);
		const { GET } = await import("./route");
		const response = await GET(
			new Request("http://localhost/api/spending-limits"),
		);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			limits: { dailyLimit: 5000, transactionLimit: 1000 },
			todayUsage: 750,
		});
		expect(fetch).toHaveBeenCalledWith("https://backend.example/spending-limits", {
			headers: {
				"content-type": "application/json",
				"x-api-key": "server-api-key",
			},
			cache: "no-store",
		});
	});

	it("forwards the caller authorization to mux-backend", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ limits: {}, todayUsage: 0 }), { status: 200 }),
		);
		const { GET } = await import("./route");

		await GET(
			new Request("http://localhost/api/spending-limits", {
				headers: { authorization: "Bearer verified-session-token" },
			}),
		);

		expect(fetch).toHaveBeenCalledWith("https://backend.example/spending-limits", {
			headers: {
				"content-type": "application/json",
				"x-api-key": "server-api-key",
				authorization: "Bearer verified-session-token",
			},
			cache: "no-store",
		});
	});

	it("does not return mock data when the backend is not configured", async () => {
		getBackendApiBaseUrl.mockReturnValue("");
		const { GET } = await import("./route");

		const response = await GET(
			new Request("http://localhost/api/spending-limits"),
		);

		expect(response.status).toBe(503);
		await expect(response.json()).resolves.toEqual({
			error: "Spending limits backend is not configured",
		});
		expect(fetch).not.toHaveBeenCalled();
	});

	it("persists a valid update and returns the updated payload", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(
				JSON.stringify({
					limits: { dailyLimit: 8000, transactionLimit: 2000 },
					todayUsage: 750,
				}),
				{ status: 200 },
			),
		);
		const { PUT } = await import("./route");
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

		expect(fetch).toHaveBeenCalledWith("https://backend.example/spending-limits", {
			method: "PUT",
			headers: {
				"content-type": "application/json",
				"x-api-key": "server-api-key",
			},
			body: JSON.stringify({ dailyLimit: 8000, transactionLimit: 2000 }),
			cache: "no-store",
		});
	});

	it("rejects malformed or missing payloads", async () => {
		const { PUT } = await import("./route");

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
