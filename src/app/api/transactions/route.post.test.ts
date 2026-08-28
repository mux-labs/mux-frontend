import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/transactions/route";
import { mockTransactions } from "@/mock-data/transactions";

const VALID_DESTINATION =
	"GBDEVU63Y6NTHJQQZIKVTC23NWLQVP3WJ2RI2OTSJTNYOIGICST6DUXR";
const VALID_SOURCE = "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
	return new Request("http://localhost/api/transactions", {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: JSON.stringify(body),
	});
}

describe("POST /api/transactions", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	describe("validation", () => {
		it("rejects an invalid destination address", async () => {
			const res = await POST(
				makeRequest({
					to: "not-an-address",
					amountXlm: "10",
					network: "testnet",
				}),
			);
			expect(res.status).toBe(400);
		});

		it("rejects a non-positive amount", async () => {
			const res = await POST(
				makeRequest({
					to: VALID_DESTINATION,
					amountXlm: "0",
					network: "testnet",
				}),
			);
			expect(res.status).toBe(400);
		});

		it("rejects a missing/invalid network", async () => {
			const res = await POST(
				makeRequest({ to: VALID_DESTINATION, amountXlm: "10" }),
			);
			expect(res.status).toBe(400);
		});
	});

	describe("without a configured backend (mock fallback)", () => {
		it("creates and stores a real pending transaction instead of silently succeeding with no side effect", async () => {
			const before = mockTransactions.length;

			const res = await POST(
				makeRequest({
					from: VALID_SOURCE,
					to: VALID_DESTINATION,
					amountXlm: "42.5",
					memo: "test send",
					network: "testnet",
				}),
			);
			const json = await res.json();

			expect(res.status).toBe(201);
			expect(json).toMatchObject({
				from: VALID_SOURCE,
				to: VALID_DESTINATION,
				amountXlm: "42.5000000",
				memo: "test send",
				network: "testnet",
				status: "pending",
			});
			expect(json.hash).toMatch(/^[0-9a-f]{64}$/);

			expect(mockTransactions.length).toBe(before + 1);
			expect(mockTransactions[0]).toMatchObject({ hash: json.hash });
		});
	});

	describe("with a configured backend", () => {
		beforeEach(() => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
		});

		it("proxies the send request to the backend", async () => {
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				status: 201,
				json: () => Promise.resolve({ hash: "abc123", status: "pending" }),
			});
			global.fetch = fetchMock as unknown as typeof fetch;

			const res = await POST(
				makeRequest(
					{
						to: VALID_DESTINATION,
						amountXlm: "10",
						network: "mainnet",
					},
					{ authorization: "Bearer token" },
				),
			);
			const json = await res.json();

			expect(fetchMock).toHaveBeenCalledWith(
				"https://api.example.com/transactions",
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({ authorization: "Bearer token" }),
				}),
			);
			expect(json).toEqual({ hash: "abc123", status: "pending" });
		});

		it("propagates backend error responses instead of pretending to succeed", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 422,
				json: () => Promise.resolve({ error: "insufficient funds" }),
			}) as unknown as typeof fetch;

			const res = await POST(
				makeRequest({
					to: VALID_DESTINATION,
					amountXlm: "10",
					network: "mainnet",
				}),
			);

			expect(res.status).toBe(422);
		});
	});
});
