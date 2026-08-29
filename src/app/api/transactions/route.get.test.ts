/**
 * Tests for GET /api/transactions (#654).
 *
 * Covers:
 * - Mock fallback (no NEXT_PUBLIC_API_URL, non-production): returns the full
 *   list, filters by `address` (matching either `from` or `to`), filters by
 *   `network`, honours both filters together, and ignores an unknown
 *   `network` value.
 * - Backend proxy (NEXT_PUBLIC_API_URL set): forwards the query string and
 *   the caller's `authorization` header to `${backend}/transactions`,
 *   propagates upstream error status, and returns 502 when the backend is
 *   unreachable.
 * - Production/demo split: a production build with no backend returns 503
 *   instead of silently serving fabricated history (see `canUseMockFallback`).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { mockTransactions } from "@/mock-data/transactions";
import { GET } from "./route";

type TxRow = { from: string; to: string; network: string };

const KNOWN_ADDRESS =
	"GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";

function makeRequest(url: string, headers?: Record<string, string>): Request {
	return new Request(url, { headers });
}

describe("GET /api/transactions", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	describe("mock fallback (no NEXT_PUBLIC_API_URL, non-production)", () => {
		it("returns every mock transaction when no filters are supplied", async () => {
			const res = await GET(makeRequest("http://localhost/api/transactions"));
			expect(res.status).toBe(200);

			const body = (await res.json()) as TxRow[];
			expect(body).toHaveLength(mockTransactions.length);
		});

		it("filters by address, matching either the sender or the recipient", async () => {
			const res = await GET(
				makeRequest(
					`http://localhost/api/transactions?address=${KNOWN_ADDRESS}`,
				),
			);
			const body = (await res.json()) as TxRow[];

			const expected = mockTransactions.filter(
				(tx) => tx.from === KNOWN_ADDRESS || tx.to === KNOWN_ADDRESS,
			);
			expect(body.length).toBe(expected.length);
			expect(body.length).toBeGreaterThan(0);
			expect(
				body.every(
					(tx) => tx.from === KNOWN_ADDRESS || tx.to === KNOWN_ADDRESS,
				),
			).toBe(true);
		});

		it("returns an empty list for an address with no transactions", async () => {
			const res = await GET(
				makeRequest("http://localhost/api/transactions?address=GNOSUCHADDRESS"),
			);
			expect(res.status).toBe(200);
			expect(await res.json()).toEqual([]);
		});

		it("filters by network", async () => {
			const res = await GET(
				makeRequest("http://localhost/api/transactions?network=testnet"),
			);
			const body = (await res.json()) as TxRow[];

			expect(body.length).toBe(
				mockTransactions.filter((tx) => tx.network === "testnet").length,
			);
			expect(body.every((tx) => tx.network === "testnet")).toBe(true);
		});

		it("applies the address and network filters together", async () => {
			const res = await GET(
				makeRequest(
					`http://localhost/api/transactions?address=${KNOWN_ADDRESS}&network=mainnet`,
				),
			);
			const body = (await res.json()) as TxRow[];

			expect(
				body.every(
					(tx) =>
						(tx.from === KNOWN_ADDRESS || tx.to === KNOWN_ADDRESS) &&
						tx.network === "mainnet",
				),
			).toBe(true);
			expect(body.length).toBe(
				mockTransactions.filter(
					(tx) =>
						(tx.from === KNOWN_ADDRESS || tx.to === KNOWN_ADDRESS) &&
						tx.network === "mainnet",
				).length,
			);
		});

		it("ignores an unrecognised network value instead of returning nothing", async () => {
			const res = await GET(
				makeRequest("http://localhost/api/transactions?network=regtest"),
			);
			const body = (await res.json()) as TxRow[];
			expect(body).toHaveLength(mockTransactions.length);
		});
	});

	describe("backend proxy (NEXT_PUBLIC_API_URL is set)", () => {
		it("forwards the query string and authorization header to the backend", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: () => Promise.resolve([{ hash: "deadbeef", network: "mainnet" }]),
			});
			vi.stubGlobal("fetch", fetchMock);

			const res = await GET(
				makeRequest(
					`http://localhost/api/transactions?address=${KNOWN_ADDRESS}&network=mainnet`,
					{ authorization: "Bearer caller-token" },
				),
			);

			expect(res.status).toBe(200);
			expect(await res.json()).toEqual([
				{ hash: "deadbeef", network: "mainnet" },
			]);
			expect(fetchMock).toHaveBeenCalledWith(
				`https://api.example.com/transactions?address=${KNOWN_ADDRESS}&network=mainnet`,
				expect.objectContaining({
					headers: expect.objectContaining({
						authorization: "Bearer caller-token",
					}),
					cache: "no-store",
				}),
			);
		});

		it("propagates the upstream error status instead of falling back to mock data", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
			vi.stubGlobal(
				"fetch",
				vi.fn().mockResolvedValue({
					ok: false,
					status: 503,
					json: () => Promise.resolve({ error: "upstream down" }),
				}),
			);

			const res = await GET(makeRequest("http://localhost/api/transactions"));
			expect(res.status).toBe(503);
			expect(await res.json()).toEqual({ error: "upstream down" });
		});

		it("returns 502 when the backend is unreachable", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
			vi.stubGlobal(
				"fetch",
				vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
			);

			const res = await GET(makeRequest("http://localhost/api/transactions"));
			expect(res.status).toBe(502);
		});
	});

	describe("production without a configured backend", () => {
		it("returns 503 instead of silently serving mock transactions", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "");
			vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "");
			vi.stubEnv("NEXT_PUBLIC_API_BASE", "");
			vi.stubEnv("NODE_ENV", "production");

			const res = await GET(makeRequest("http://localhost/api/transactions"));
			expect(res.status).toBe(503);
			const body = await res.json();
			expect(body.error).toBe("backend_unavailable");
		});
	});
});
