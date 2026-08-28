/**
 * Tests for GET /api/wallets.
 *
 * Covers:
 * - Requires a bearer token
 * - Proxies to the backend when NEXT_PUBLIC_API_URL is set (forwarding the
 *   `network` query param, confirming useWallets({ network }) is actually
 *   scoping the request server-side)
 * - Falls back to mock wallets in non-production when no backend is set
 * - Never falls back to mock wallets in a production build — fails loudly
 *   with 503 instead (the production/demo split this route must keep
 *   explicit; see `isMockFallbackAllowed()` in src/lib/api/config.ts)
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

function makeRequest(url: string, authorization?: string): Request {
	return new Request(url, {
		headers: authorization ? { authorization } : undefined,
	});
}

describe("GET /api/wallets", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	it("returns 401 when no bearer token is provided", async () => {
		const res = await GET(makeRequest("http://localhost/api/wallets"));
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBe("missing_auth");
	});

	describe("backend proxy (NEXT_PUBLIC_API_URL is set)", () => {
		it("forwards the network query param to the backend", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([{ id: "w1", network: "testnet" }]),
			});
			vi.stubGlobal("fetch", fetchMock);

			const res = await GET(
				makeRequest(
					"http://localhost/api/wallets?network=testnet",
					"Bearer real-token",
				),
			);

			expect(res.status).toBe(200);
			expect(fetchMock).toHaveBeenCalledWith(
				"https://api.example.com/wallets?network=testnet",
				expect.objectContaining({
					headers: expect.objectContaining({
						authorization: "Bearer real-token",
					}),
				}),
			);
		});

		it("returns 502 when the backend is unreachable", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
			vi.stubGlobal(
				"fetch",
				vi.fn().mockRejectedValue(new Error("Connection refused")),
			);

			const res = await GET(
				makeRequest("http://localhost/api/wallets", "Bearer real-token"),
			);
			expect(res.status).toBe(502);
		});
	});

	describe("mock fallback (no NEXT_PUBLIC_API_URL, non-production)", () => {
		it("returns dummy wallets for a valid mock token", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "");
			vi.stubEnv("NODE_ENV", "test");

			const res = await GET(
				makeRequest("http://localhost/api/wallets", "Bearer mock-access-token"),
			);
			expect(res.status).toBe(200);
			const body = await res.json();
			expect(Array.isArray(body)).toBe(true);
			expect(body.length).toBeGreaterThan(0);
		});

		it("rejects a mismatched mock token", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "");
			vi.stubEnv("NODE_ENV", "test");

			const res = await GET(
				makeRequest("http://localhost/api/wallets", "Bearer wrong-token"),
			);
			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.error).toBe("invalid_token");
		});

		it("scopes the mock response by the network query param", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "");
			vi.stubEnv("NODE_ENV", "test");

			const res = await GET(
				makeRequest(
					"http://localhost/api/wallets?network=testnet",
					"Bearer mock-access-token",
				),
			);
			const body = await res.json();
			expect(
				body.every(
					(wallet: { network: string }) => wallet.network === "testnet",
				),
			).toBe(true);
		});
	});

	describe("production without a configured backend", () => {
		it("returns 503 instead of silently serving mock wallets", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "");
			vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "");
			vi.stubEnv("NEXT_PUBLIC_API_BASE", "");
			vi.stubEnv("NODE_ENV", "production");

			// Even the hardcoded mock bearer token must not work here — a
			// misconfigured production deployment should fail loudly, not
			// authenticate the request against a fixture value.
			const res = await GET(
				makeRequest("http://localhost/api/wallets", "Bearer mock-access-token"),
			);

			expect(res.status).toBe(503);
			const body = await res.json();
			expect(body.error).toBe("backend_unavailable");
		});
	});
});
