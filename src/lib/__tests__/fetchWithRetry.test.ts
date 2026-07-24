import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithRetry } from "../fetchWithRetry";

describe("fetchWithRetry", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("returns immediately on success", async () => {
		const ok = new Response("{}", { status: 200 });
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(ok);

		const res = await fetchWithRetry("/api/thing", { baseDelayMs: 0 });
		expect(res.status).toBe(200);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it("retries on 500 then succeeds", async () => {
		const fail = new Response("err", { status: 500 });
		const ok = new Response("{}", { status: 200 });
		(fetch as unknown as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(fail)
			.mockResolvedValueOnce(ok);

		const res = await fetchWithRetry("/api/thing", {
			baseDelayMs: 0,
			retries: 2,
		});
		expect(res.status).toBe(200);
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	it("does not retry on 4xx (non-429)", async () => {
		const fail = new Response("bad", { status: 400 });
		(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			fail,
		);

		const res = await fetchWithRetry("/api/thing", { baseDelayMs: 0 });
		expect(res.status).toBe(400);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it("throws after exhausting retries", async () => {
		(fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("network down"),
		);

		await expect(
			fetchWithRetry("/api/thing", { baseDelayMs: 0, retries: 2 }),
		).rejects.toThrow("network down");
		expect(fetch).toHaveBeenCalledTimes(3);
	});
});
