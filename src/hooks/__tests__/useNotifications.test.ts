/**
 * Tests for useNotifications (#617).
 *
 * The hook used to keep mark-all-read in local state only. These tests lock
 * in server persistence: markAllRead must PATCH the notifications endpoint
 * with `{ markAll: true }`, and must reconcile with the server (refetch) if
 * that request fails rather than letting the optimistic update drift.
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNotifications } from "../useNotifications";

const sampleFeed = [
	{
		id: "n1",
		title: "Wallet funded",
		description: "…",
		createdAt: "2025-01-21T09:12:00Z",
		read: false,
	},
	{
		id: "n2",
		title: "Key created",
		description: "…",
		createdAt: "2025-01-20T09:12:00Z",
		read: true,
	},
];

function mockFetchOnce(handler: (url: string, init?: RequestInit) => unknown) {
	const fn = vi.fn((url: string, init?: RequestInit) =>
		Promise.resolve(handler(url, init)),
	);
	vi.stubGlobal("fetch", fn);
	return fn;
}

beforeEach(() => {
	vi.stubEnv("NEXT_PUBLIC_API_URL", "");
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("useNotifications", () => {
	it("loads the feed and computes the unread count", async () => {
		mockFetchOnce(() => ({
			ok: true,
			json: () => Promise.resolve(sampleFeed),
		}));

		const { result } = renderHook(() => useNotifications());
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.notifications).toHaveLength(2);
		expect(result.current.unreadCount).toBe(1);
	});

	it("persists markAllRead via PATCH { markAll: true }", async () => {
		const fetchFn = mockFetchOnce((url, init) => {
			if (init?.method === "PATCH") {
				return { ok: true, json: () => Promise.resolve({ ok: true }) };
			}
			return { ok: true, json: () => Promise.resolve(sampleFeed) };
		});

		const { result } = renderHook(() => useNotifications());
		await waitFor(() => expect(result.current.loading).toBe(false));

		act(() => {
			result.current.markAllRead();
		});

		// Optimistic local update
		expect(result.current.unreadCount).toBe(0);

		// Server persistence
		await waitFor(() => {
			expect(fetchFn).toHaveBeenCalledWith(
				"/api/notifications",
				expect.objectContaining({
					method: "PATCH",
					body: JSON.stringify({ markAll: true }),
				}),
			);
		});
	});

	it("reconciles with the server (refetches) when persistence fails", async () => {
		let feedCalls = 0;
		const fetchFn = mockFetchOnce((url, init) => {
			if (init?.method === "PATCH") {
				return { ok: false, status: 500, json: () => Promise.resolve({}) };
			}
			feedCalls += 1;
			return { ok: true, json: () => Promise.resolve(sampleFeed) };
		});

		const { result } = renderHook(() => useNotifications());
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(feedCalls).toBe(1);

		act(() => {
			result.current.markAllRead();
		});

		// Failed PATCH triggers a reconciling refetch of the feed.
		await waitFor(() => expect(feedCalls).toBe(2));
		expect(fetchFn).toHaveBeenCalledWith(
			"/api/notifications",
			expect.objectContaining({ method: "PATCH" }),
		);
	});
});
