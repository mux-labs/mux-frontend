import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/overview/route";

describe("GET /api/overview", () => {
	beforeEach(() => {
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

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

	it("authenticates the upstream request with MUX_API_KEY/MUX_API_SECRET (#639)", async () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "https://backend.example.com");
		vi.stubEnv("MUX_API_KEY", "key-123");
		vi.stubEnv("MUX_API_SECRET", "secret-456");

		const fetchSpy = vi
			.spyOn(global, "fetch")
			.mockResolvedValue(
				new Response(JSON.stringify({ data: {} }), { status: 200 }),
			);

		await GET(new Request("http://localhost/api/overview"));

		const [url, init] = fetchSpy.mock.calls[0];
		expect(url).toBe("https://backend.example.com/overview");
		const headers = init?.headers as Record<string, string>;
		expect(headers["x-api-key"]).toBe("key-123");
		expect(headers["x-api-secret"]).toBe("secret-456");
	});
});
