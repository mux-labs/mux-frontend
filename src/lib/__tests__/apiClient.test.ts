import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	ApiError,
	apiClient,
	optimisticUpdate,
	request,
} from "../apiClient";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(
	body: unknown,
	status = 200,
	statusText = "OK",
): ReturnType<typeof vi.fn> {
	return vi.fn().mockResolvedValue({
		ok: status >= 200 && status < 300,
		status,
		statusText,
		json: () => Promise.resolve(body),
	});
}

// ---------------------------------------------------------------------------
// request()
// ---------------------------------------------------------------------------

describe("request()", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", mockFetch({ id: 1, name: "test" }));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("calls fetch with the correct URL and default headers", async () => {
		await request("/wallets");

		expect(fetch).toHaveBeenCalledOnce();
		const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(url).toBe("/wallets");
		expect((init as RequestInit).headers).toMatchObject({
			"Content-Type": "application/json",
			Accept: "application/json",
		});
	});

	it("prepends baseUrl when provided", async () => {
		await request("/wallets", { baseUrl: "https://api.example.com" });

		const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(url).toBe("https://api.example.com/wallets");
	});

	it("returns parsed JSON on success", async () => {
		const result = await request<{ id: number; name: string }>("/wallets");
		expect(result).toEqual({ id: 1, name: "test" });
	});

	it("serialises body to JSON for POST requests", async () => {
		await request("/wallets", { method: "POST", body: { address: "0xabc" } });

		const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect((init as RequestInit).body).toBe(JSON.stringify({ address: "0xabc" }));
	});

	it("throws ApiError with status and message on non-2xx response", async () => {
		vi.stubGlobal(
			"fetch",
			mockFetch({ message: "Not found" }, 404, "Not Found"),
		);

		await expect(request("/wallets/999")).rejects.toThrow(ApiError);
		await expect(request("/wallets/999")).rejects.toMatchObject({
			status: 404,
			message: "Not found",
		});
	});

	it("falls back to statusText when error body has no message", async () => {
		vi.stubGlobal("fetch", mockFetch({}, 500, "Internal Server Error"));

		await expect(request("/wallets")).rejects.toMatchObject({
			status: 500,
			message: "Internal Server Error",
		});
	});

	it("returns undefined for 204 No Content", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 204,
				statusText: "No Content",
				json: () => Promise.reject(new SyntaxError("no body")),
			}),
		);

		const result = await request("/wallets/1");
		expect(result).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// apiClient convenience methods
// ---------------------------------------------------------------------------

describe("apiClient convenience methods", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", mockFetch({ ok: true }));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("apiClient.get sends GET", async () => {
		await apiClient.get("/wallets");
		const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect((init as RequestInit).method).toBe("GET");
	});

	it("apiClient.post sends POST with body", async () => {
		await apiClient.post("/wallets", { address: "0xabc" });
		const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect((init as RequestInit).method).toBe("POST");
		expect((init as RequestInit).body).toBe(JSON.stringify({ address: "0xabc" }));
	});

	it("apiClient.put sends PUT with body", async () => {
		await apiClient.put("/wallets/1", { status: "inactive" });
		const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect((init as RequestInit).method).toBe("PUT");
	});

	it("apiClient.patch sends PATCH with body", async () => {
		await apiClient.patch("/wallets/1", { balance: "100 XLM" });
		const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect((init as RequestInit).method).toBe("PATCH");
	});

	it("apiClient.delete sends DELETE", async () => {
		await apiClient.delete("/wallets/1");
		const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect((init as RequestInit).method).toBe("DELETE");
	});
});

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

describe("ApiError", () => {
	it("has the correct name, status, and statusText", () => {
		const err = new ApiError(422, "Unprocessable Entity", "Validation failed");
		expect(err.name).toBe("ApiError");
		expect(err.status).toBe(422);
		expect(err.statusText).toBe("Unprocessable Entity");
		expect(err.message).toBe("Validation failed");
		expect(err).toBeInstanceOf(Error);
	});
});

// ---------------------------------------------------------------------------
// optimisticUpdate()
// ---------------------------------------------------------------------------

describe("optimisticUpdate()", () => {
	it("applies the optimistic state immediately before mutation resolves", async () => {
		const states: string[][] = [];
		let items = ["a", "b"];

		const applyOptimistic = vi.fn((snapshot: string[]) => {
			items = [...snapshot, "c"];
			states.push([...items]);
		});

		const mutate = vi.fn().mockResolvedValue(undefined);

		await optimisticUpdate({
			getSnapshot: () => items,
			applyOptimistic,
			mutate,
		});

		// applyOptimistic was called once (on success path, no rollback)
		expect(applyOptimistic).toHaveBeenCalledOnce();
		expect(states[0]).toEqual(["a", "b", "c"]);
	});

	it("calls onSuccess after a successful mutation", async () => {
		const onSuccess = vi.fn();

		await optimisticUpdate({
			getSnapshot: () => [] as string[],
			applyOptimistic: vi.fn(),
			mutate: vi.fn().mockResolvedValue(undefined),
			onSuccess,
		});

		expect(onSuccess).toHaveBeenCalledOnce();
	});

	it("rolls back to snapshot and calls onError when mutation fails", async () => {
		let items = ["a", "b"];
		const snapshots: string[][] = [];

		const applyOptimistic = vi.fn((snapshot: string[]) => {
			// First call: apply optimistic; second call (rollback): restore snapshot
			items = snapshots.length === 0 ? [...snapshot, "c"] : [...snapshot];
			snapshots.push([...snapshot]);
		});

		const error = new Error("network error");
		const mutate = vi.fn().mockRejectedValue(error);
		const onError = vi.fn();

		await optimisticUpdate({
			getSnapshot: () => items,
			applyOptimistic,
			mutate,
			onError,
		});

		// applyOptimistic called twice: once optimistically, once for rollback
		expect(applyOptimistic).toHaveBeenCalledTimes(2);
		expect(onError).toHaveBeenCalledWith(error, expect.any(Array));
	});

	it("does not call onSuccess when mutation fails", async () => {
		const onSuccess = vi.fn();
		const onError = vi.fn();

		await optimisticUpdate({
			getSnapshot: () => [] as string[],
			applyOptimistic: vi.fn(),
			mutate: vi.fn().mockRejectedValue(new Error("fail")),
			onSuccess,
			onError,
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without optional onSuccess / onError callbacks", async () => {
		await expect(
			optimisticUpdate({
				getSnapshot: () => [] as string[],
				applyOptimistic: vi.fn(),
				mutate: vi.fn().mockResolvedValue(undefined),
			}),
		).resolves.toBeUndefined();
	});

	it("does not throw when mutation fails and no onError is provided", async () => {
		await expect(
			optimisticUpdate({
				getSnapshot: () => [] as string[],
				applyOptimistic: vi.fn(),
				mutate: vi.fn().mockRejectedValue(new Error("fail")),
			}),
		).resolves.toBeUndefined();
	});
});
