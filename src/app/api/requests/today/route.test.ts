import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/requests/today/route";
import { mockOverview } from "@/mock-data/overview";

function makeRequest(headers: Record<string, string> = {}) {
	return new Request("http://localhost/api/requests/today", { headers });
}

describe("GET /api/requests/today", () => {
	const originalFetch = global.fetch;

	afterEach(() => {
		global.fetch = originalFetch;
		vi.unstubAllEnvs();
	});

	describe("without a configured backend (mock fallback)", () => {
		it("returns the mock telemetry count, not a hardcoded 42", async () => {
			const res = await GET(makeRequest());
			const json = await res.json();

			expect(json).toEqual({ count: mockOverview.apiRequestsToday });
			expect(json.count).not.toBe(42);
		});
	});

	describe("with a configured backend", () => {
		beforeEach(() => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
		});

		it("proxies to the backend telemetry endpoint", async () => {
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ count: 777 }),
			});
			global.fetch = fetchMock as unknown as typeof fetch;

			const res = await GET(makeRequest({ authorization: "Bearer token" }));
			const json = await res.json();

			expect(fetchMock).toHaveBeenCalledWith(
				"https://api.example.com/requests/today",
				expect.objectContaining({
					headers: expect.objectContaining({ authorization: "Bearer token" }),
				}),
			);
			expect(json).toEqual({ count: 777 });
		});

		it("propagates upstream error status codes", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 503,
				json: () => Promise.resolve({ error: "unavailable" }),
			}) as unknown as typeof fetch;

			const res = await GET(makeRequest());
			expect(res.status).toBe(503);
		});

		it("returns a 502 when the backend is unreachable", async () => {
			global.fetch = vi
				.fn()
				.mockRejectedValue(
					new Error("network down"),
				) as unknown as typeof fetch;

			const res = await GET(makeRequest());
			expect(res.status).toBe(502);
		});
	});
});
