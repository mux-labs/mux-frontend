import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	__resetWalletsPrefetchCacheForTests,
	getWalletsPrefetchEntry,
	prefetchWallets,
} from "@/lib/walletsPrefetchCache";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchMock(ok = true, payload: unknown = []) {
	return vi.fn(() =>
		Promise.resolve({
			ok,
			status: ok ? 200 : 500,
			json: () => Promise.resolve(payload),
		}),
	);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("walletsPrefetchCache", () => {
	beforeEach(() => {
		__resetWalletsPrefetchCacheForTests();
		vi.stubGlobal("fetch", makeFetchMock());
		// Ensure no session cookie is present by default so tests are isolated.
		vi.stubGlobal("document", { cookie: "" });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	// -- basic contract --

	it("returns null when nothing has been prefetched yet", () => {
		expect(getWalletsPrefetchEntry()).toBeNull();
	});

	it("dedupes concurrent prefetch calls into a single request", async () => {
		const first = prefetchWallets();
		const second = prefetchWallets();

		expect(first).toBe(second);
		await first;
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it("exposes the in-flight entry via getWalletsPrefetchEntry", async () => {
		const promise = prefetchWallets();
		expect(getWalletsPrefetchEntry()).toBe(promise);
		await promise;
	});

	it("clears the cache on failure so a later call can retry", async () => {
		vi.stubGlobal("fetch", makeFetchMock(false));

		await expect(prefetchWallets()).rejects.toThrow();
		expect(getWalletsPrefetchEntry()).toBeNull();
	});

	// -- TTL --

	it("re-fetches after the TTL has expired", async () => {
		const fetchMock = makeFetchMock();
		vi.stubGlobal("fetch", fetchMock);

		await prefetchWallets();
		expect(fetchMock).toHaveBeenCalledTimes(1);

		// Advance time past the 30-second TTL.
		const realNow = Date.now();
		vi.spyOn(Date, "now").mockReturnValue(realNow + 31_000);

		// Entry should now be treated as expired.
		expect(getWalletsPrefetchEntry()).toBeNull();

		await prefetchWallets();
		expect(fetchMock).toHaveBeenCalledTimes(2);

		vi.restoreAllMocks();
	});

	// -- tenant isolation (#705) --

	it("REGRESSION #705: does NOT serve cached wallets across different sessions", async () => {
		const fetchMock = makeFetchMock();
		vi.stubGlobal("fetch", fetchMock);

		// Prefetch as user A (session cookie = "session_a").
		vi.stubGlobal("document", { cookie: "mux_auth_token=session_a" });
		const promiseA = prefetchWallets();
		await promiseA;

		// Switch to user B (different session cookie).
		vi.stubGlobal("document", { cookie: "mux_auth_token=session_b" });

		// The cache entry for user A must NOT be returned for user B.
		expect(getWalletsPrefetchEntry()).toBeNull();

		// A fresh fetch should be issued for user B.
		await prefetchWallets();
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("REGRESSION #705: serves the same cached entry within a single session", async () => {
		const fetchMock = makeFetchMock();
		vi.stubGlobal("fetch", fetchMock);

		vi.stubGlobal("document", { cookie: "mux_auth_token=session_a" });

		const first = prefetchWallets();
		const second = prefetchWallets();

		// Same session — must be deduplicated to a single request.
		expect(first).toBe(second);
		await first;
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("REGRESSION #705: resets the cache for all sessions on logout", async () => {
		const fetchMock = makeFetchMock();
		vi.stubGlobal("fetch", fetchMock);

		// Prime the cache for two different sessions.
		vi.stubGlobal("document", { cookie: "mux_auth_token=session_a" });
		await prefetchWallets();

		vi.stubGlobal("document", { cookie: "mux_auth_token=session_b" });
		await prefetchWallets();

		expect(fetchMock).toHaveBeenCalledTimes(2);

		// Simulate logout — cache must be fully cleared.
		__resetWalletsPrefetchCacheForTests();

		// Neither session should have a cache entry now.
		vi.stubGlobal("document", { cookie: "mux_auth_token=session_a" });
		expect(getWalletsPrefetchEntry()).toBeNull();

		vi.stubGlobal("document", { cookie: "mux_auth_token=session_b" });
		expect(getWalletsPrefetchEntry()).toBeNull();
	});

	// -- no-backend environment (unauthenticated / SSR) --

	it("uses an empty session discriminator when document is undefined (SSR/Node)", async () => {
		// Remove the global document to simulate a server environment.
		vi.stubGlobal("document", undefined);
		const fetchMock = makeFetchMock();
		vi.stubGlobal("fetch", fetchMock);

		await prefetchWallets();
		// Should not throw and should prime the cache.
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(getWalletsPrefetchEntry()).not.toBeNull();
	});
});
