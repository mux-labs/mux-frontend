import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuditLogPagination } from "./useAuditLogPagination";

describe("useAuditLogPagination", () => {
	it("classifies a 429 with Retry-After as rate_limited with a parsed retryAt", async () => {
		const fetchImpl = vi.fn<typeof fetch>(async () =>
			new Response(null, { status: 429, headers: { "retry-after": "60" } }),
		);
		const { result } = renderHook(() =>
			useAuditLogPagination({ fetchImpl, limit: 10 }),
		);

		await waitFor(() => expect(result.current.status).toBe("error"));
		expect(result.current.error?.kind).toBe("rate_limited");
		expect(
			result.current.error?.kind === "rate_limited" &&
				typeof result.current.error.retryAt === "number",
		).toBe(true);
	});

	it("classifies a 503 maintenance response as unavailable", async () => {
		const fetchImpl = vi.fn<typeof fetch>(async () =>
			new Response(null, {
				status: 503,
				headers: { "x-mux-maintenance": "true", "retry-after": "30" },
			}),
		);
		const { result } = renderHook(() =>
			useAuditLogPagination({ fetchImpl, limit: 10 }),
		);

		await waitFor(() => expect(result.current.status).toBe("error"));
		expect(result.current.error?.kind).toBe("unavailable");
	});

	it("classifies a 200 with an unparseable body as failed/invalid_response", async () => {
		const fetchImpl = vi.fn<typeof fetch>(async () =>
			Response.json({ not: "a page" }),
		);
		const { result } = renderHook(() =>
			useAuditLogPagination({ fetchImpl, limit: 10 }),
		);

		await waitFor(() => expect(result.current.status).toBe("error"));
		expect(result.current.error).toEqual(
			expect.objectContaining({ kind: "failed", code: "invalid_response" }),
		);
	});

	it("classifies a rejected fetch (TypeError) as failed/network_error", async () => {
		const fetchImpl = vi.fn<typeof fetch>(async () => {
			throw new TypeError("Failed to fetch");
		});
		const { result } = renderHook(() =>
			useAuditLogPagination({ fetchImpl, limit: 10 }),
		);

		await waitFor(() => expect(result.current.status).toBe("error"));
		expect(result.current.error).toEqual(
			expect.objectContaining({ kind: "failed", code: "network_error" }),
		);
	});

	it("aborts the in-flight request and restarts from page 1 when filters change", async () => {
		const signals: AbortSignal[] = [];
		const fetchImpl = vi.fn<typeof fetch>(async (_input, init) => {
			if (init?.signal) signals.push(init.signal);
			// Never resolves on its own; the hook's next request must abort it.
			return new Promise<Response>(() => {});
		});

		const { result, rerender } = renderHook(
			({ filters }) => useAuditLogPagination({ fetchImpl, limit: 10, filters }),
			{ initialProps: { filters: { actor: "alice" } } },
		);

		await waitFor(() => expect(signals).toHaveLength(1));
		expect(signals[0].aborted).toBe(false);
		expect(result.current.status).toBe("loading");

		rerender({ filters: { actor: "bob" } });

		await waitFor(() => expect(signals[0].aborted).toBe(true));
		await waitFor(() => expect(signals.length).toBeGreaterThanOrEqual(2));
		expect(result.current.items).toEqual([]);
	});
});
