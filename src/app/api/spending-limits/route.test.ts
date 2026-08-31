/**
 * Tests for /api/spending-limits
 *
 * Covers original proxy behavior plus #710 fixes:
 * - Auth header required on GET and PUT
 * - No mock data served in production without a backend
 * - Non-production mock fallback when no backend configured
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getBackendApiBaseUrl, getServerApiKey, isMockFallbackAllowed } =
	vi.hoisted(() => ({
		getBackendApiBaseUrl: vi.fn(() => "https://backend.example"),
		getServerApiKey: vi.fn(() => "server-api-key"),
		isMockFallbackAllowed: vi.fn(() => true),
	}));

vi.mock("@/lib/api/config", () => ({
	getBackendApiBaseUrl,
	getServerApiKey,
	isMockFallbackAllowed,
}));

describe("/api/spending-limits", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getBackendApiBaseUrl.mockReturnValue("https://backend.example");
		getServerApiKey.mockReturnValue("server-api-key");
		isMockFallbackAllowed.mockReturnValue(true);
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	// ── Auth gating (#710) ────────────────────────────────────────────────────

	describe("auth gating (#710)", () => {
		it("GET returns 401 when Authorization header is missing", async () => {
			const { GET } = await import("./route");
			const res = await GET(
				new Request("http://localhost/api/spending-limits"),
			);
			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.error).toBe("missing_auth");
		});

		it("GET returns 401 when Authorization is not a Bearer token", async () => {
			const { GET } = await import("./route");
			const res = await GET(
				new Request("http://localhost/api/spending-limits", {
					headers: { authorization: "Basic abc123" },
				}),
			);
			expect(res.status).toBe(401);
		});

		it("PUT returns 401 when Authorization header is missing", async () => {
			const { PUT } = await import("./route");
			const res = await PUT(
				new Request("http://localhost/api/spending-limits", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ dailyLimit: 5000, transactionLimit: 1000 }),
				}),
			);
			expect(res.status).toBe(401);
		});
	});

	// ── Production mock guard (#710) ──────────────────────────────────────────

	describe("no mock in production (#710)", () => {
		it("GET returns 503 with backend_unavailable when no backend and production mode", async () => {
			getBackendApiBaseUrl.mockReturnValue("");
			isMockFallbackAllowed.mockReturnValue(false);
			const { GET } = await import("./route");

			const res = await GET(
				new Request("http://localhost/api/spending-limits", {
					headers: { authorization: "Bearer some-token" },
				}),
			);
			expect(res.status).toBe(503);
			const body = await res.json();
			expect(body.error).toBe("backend_unavailable");
		});

		it("GET returns mock limits in non-production with no backend", async () => {
			getBackendApiBaseUrl.mockReturnValue("");
			isMockFallbackAllowed.mockReturnValue(true);
			const { GET } = await import("./route");

			const res = await GET(
				new Request("http://localhost/api/spending-limits", {
					headers: { authorization: "Bearer mock-access-token" },
				}),
			);
			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.limits).toBeDefined();
			expect(typeof body.limits.dailyLimit).toBe("number");
			expect(typeof body.todayUsage).toBe("number");
		});
	});

	// ── Proxy behavior (original tests updated for auth header) ───────────────

	it("returns the current limits and usage when backend is configured", async () => {
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
			new Request("http://localhost/api/spending-limits", {
				headers: { authorization: "Bearer valid-token" },
			}),
		);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			limits: { dailyLimit: 5000, transactionLimit: 1000 },
			todayUsage: 750,
		});
		expect(fetch).toHaveBeenCalledWith(
			"https://backend.example/spending-limits",
			expect.objectContaining({
				headers: expect.objectContaining({
					"content-type": "application/json",
					"x-api-key": "server-api-key",
					authorization: "Bearer valid-token",
				}),
			}),
		);
	});

	it("forwards the caller authorization to mux-backend", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ limits: {}, todayUsage: 0 }), {
				status: 200,
			}),
		);
		const { GET } = await import("./route");

		await GET(
			new Request("http://localhost/api/spending-limits", {
				headers: { authorization: "Bearer verified-session-token" },
			}),
		);

		expect(fetch).toHaveBeenCalledWith(
			"https://backend.example/spending-limits",
			expect.objectContaining({
				headers: expect.objectContaining({
					authorization: "Bearer verified-session-token",
				}),
			}),
		);
	});

	it("does not reach fetch when the backend URL is empty and production mode", async () => {
		getBackendApiBaseUrl.mockReturnValue("");
		isMockFallbackAllowed.mockReturnValue(false);
		const { GET } = await import("./route");

		const response = await GET(
			new Request("http://localhost/api/spending-limits", {
				headers: { authorization: "Bearer some-token" },
			}),
		);

		expect(response.status).toBe(503);
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
			headers: {
				"Content-Type": "application/json",
				authorization: "Bearer valid-token",
			},
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
	});

	it("rejects malformed or missing PUT payloads", async () => {
		const { PUT } = await import("./route");

		const missingFieldResponse = await PUT(
			new Request("http://localhost/api/spending-limits", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					authorization: "Bearer valid-token",
				},
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
				headers: {
					"Content-Type": "application/json",
					authorization: "Bearer valid-token",
				},
				body: JSON.stringify({
					dailyLimit: "1000",
					transactionLimit: 1000,
				}),
			}),
		);
		expect(invalidTypeResponse.status).toBe(400);

		const invalidJsonResponse = await PUT({
			headers: {
				get: (key: string) =>
					key === "authorization" ? "Bearer valid-token" : null,
			},
			json: async () => {
				throw new Error("Unexpected token");
			},
		} as unknown as Request);
		expect(invalidJsonResponse.status).toBe(400);
	});
});
