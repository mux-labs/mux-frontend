/**
 * Tests for POST /api/send/draft (issue #616 — wire SendDraftScreen to the
 * send flow backend).
 *
 * Covers:
 * - 400 for missing / invalid input
 * - proxies to the backend when NEXT_PUBLIC_API_URL is set
 * - surfaces upstream error status
 * - 502 when the backend is unreachable
 * - mock preview only outside production when no backend is configured
 * - 501 (no silent mock success) in production when no backend is configured
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// A checksum-valid testnet address (used by other suites in this repo).
const VALID_ADDRESS =
	"GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";

function makeRequest(
	body: unknown,
	headers: Record<string, string> = {},
): Request {
	return new Request("http://localhost/api/send/draft", {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: typeof body === "string" ? body : JSON.stringify(body),
	});
}

describe("POST /api/send/draft (#616)", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	it("returns 400 for an unparseable body", async () => {
		const res = await POST(makeRequest("not-json"));
		expect(res.status).toBe(400);
	});

	it("returns 400 when the destination is missing", async () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "");
		const res = await POST(makeRequest({ amount: "10" }));
		expect(res.status).toBe(400);
	});

	it("returns 400 for a non-positive amount", async () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "");
		const res = await POST(
			makeRequest({ destination: VALID_ADDRESS, amount: "0" }),
		);
		expect(res.status).toBe(400);
	});

	describe("backend proxy (NEXT_PUBLIC_API_URL set)", () => {
		it("proxies to ${backend}/send/draft and returns the preview", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
			const preview = {
				valid: true,
				destination: VALID_ADDRESS,
				amount: "10",
				fee: "0.00001",
				estimatedArrival: "a few seconds",
			};
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: () => Promise.resolve(preview),
			});
			vi.stubGlobal("fetch", fetchMock);

			const res = await POST(
				makeRequest(
					{ destination: VALID_ADDRESS, amount: "10" },
					{ authorization: "Bearer token-123" },
				),
			);

			expect(res.status).toBe(200);
			const payload = await res.json();
			expect(payload).toMatchObject({ valid: true });
			expect(payload).not.toHaveProperty("mock");
			expect(fetchMock).toHaveBeenCalledWith(
				"https://api.example.com/send/draft",
				expect.objectContaining({ method: "POST" }),
			);
			const init = fetchMock.mock.calls[0][1];
			expect(init.headers.authorization).toBe("Bearer token-123");
		});

		it("passes through an upstream error status", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
			vi.stubGlobal(
				"fetch",
				vi.fn().mockResolvedValue({
					ok: false,
					status: 422,
					json: () => Promise.resolve({ error: "insufficient balance" }),
				}),
			);

			const res = await POST(
				makeRequest({ destination: VALID_ADDRESS, amount: "999999" }),
			);
			expect(res.status).toBe(422);
			expect(await res.json()).toEqual({ error: "insufficient balance" });
		});

		it("returns 502 when the backend fetch throws", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
			vi.stubGlobal(
				"fetch",
				vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
			);

			const res = await POST(
				makeRequest({ destination: VALID_ADDRESS, amount: "10" }),
			);
			expect(res.status).toBe(502);
		});
	});

	describe("no backend configured", () => {
		it("returns a mock preview outside production", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "");
			vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "");
			vi.stubEnv("NEXT_PUBLIC_API_BASE", "");
			vi.stubEnv("NODE_ENV", "test");

			const res = await POST(
				makeRequest({ destination: VALID_ADDRESS, amount: "10" }),
			);
			expect(res.status).toBe(200);
			expect(await res.json()).toMatchObject({ valid: true, mock: true });
		});

		it("returns 501 in production instead of a silent mock success", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "");
			vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "");
			vi.stubEnv("NEXT_PUBLIC_API_BASE", "");
			vi.stubEnv("NODE_ENV", "production");

			const res = await POST(
				makeRequest({ destination: VALID_ADDRESS, amount: "10" }),
			);
			expect(res.status).toBe(501);
		});
	});
});
