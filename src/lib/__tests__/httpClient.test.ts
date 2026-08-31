import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJson } from "../http-client";

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

describe("fetchJson", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(jsonResponse({ ok: true })),
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it("returns parsed data and requests with no-store cache", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse([{ id: "t1" }]));

		const result =
			await fetchJson<Record<string, unknown>[]>("/api/transactions");

		expect(result.error).toBeUndefined();
		expect(result.data).toEqual([{ id: "t1" }]);
		expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/transactions");
		const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
		expect(init.cache).toBe("no-store");
	});

	it("maps non-ok responses to an error string", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: "boom" }, 503));

		const result = await fetchJson("/api/transactions");

		expect(result.data).toBeUndefined();
		expect(result.error).toBe('HTTP 503: {"error":"boom"}');
	});

	it("maps thrown fetch failures to an error string", async () => {
		vi.mocked(fetch).mockRejectedValue(new Error("network down"));

		const result = await fetchJson("/api/transactions");

		expect(result.data).toBeUndefined();
		expect(result.error).toBe("network down");
	});
});
