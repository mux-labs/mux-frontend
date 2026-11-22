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

	it("reads /api/activity by cursor and reloads from page 1 when filters change", async () => {
		const entry = (id: string, actor: string) => ({
			id,
			actor,
			action: "wallet.created",
			createdAt: "2026-01-01T00:00:00.000Z",
			network: "testnet" as const,
		});
		const urls: string[] = [];
		const fetchImpl = vi.fn<typeof fetch>(async (input) => {
			const url = new URL(String(input), "http://localhost");
			urls.push(`${url.pathname}${url.search}`);
			const cursor = url.searchParams.get("cursor");
			const actor = url.searchParams.get("actor") ?? "any";
			if (cursor === null) {
				return Response.json({
					items: [entry(`${actor}-1`, actor)],
					nextCursor: "cursor-1",
				});
			}
			return Response.json({
				items: [entry(`${actor}-2`, actor)],
				nextCursor: null,
			});
		});

		const { result, rerender } = renderHook(
			({ filters }) => useAuditLogPagination({ fetchImpl, limit: 10, filters }),
			{ initialProps: { filters: { actor: "alice" } } },
		);

		await waitFor(() => expect(result.current.items).toHaveLength(1));
		expect(urls[0]).toBe("/api/activity?actor=alice&limit=10");
		expect(result.current.canLoadMore).toBe(true);

		result.current.loadMore();

		await waitFor(() => expect(result.current.items).toHaveLength(2));
		expect(urls[1]).toBe("/api/activity?actor=alice&limit=10&cursor=cursor-1");
		expect(result.current.items.map((item) => item.id)).toEqual([
			"alice-1",
			"alice-2",
		]);
		expect(result.current.canLoadMore).toBe(false);

		rerender({ filters: { actor: "bob" } });

		await waitFor(() =>
			expect(result.current.items.map((item) => item.id)).toEqual(["bob-1"]),
		);
		// Filters changed: the next read starts from page 1, with no cursor.
		expect(urls[2]).toBe("/api/activity?actor=bob&limit=10");
		expect(urls[2]).not.toContain("cursor=");
	});
});
