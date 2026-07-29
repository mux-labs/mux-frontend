import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	__resetWalletsPrefetchCacheForTests,
	getWalletsPrefetchEntry,
	prefetchWallets,
} from "@/lib/walletsPrefetchCache";

describe("walletsPrefetchCache", () => {
	beforeEach(() => {
		__resetWalletsPrefetchCacheForTests();
		vi.stubGlobal(
			"fetch",
			vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve([]),
				}),
			),
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

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
		vi.stubGlobal(
			"fetch",
			vi.fn(() => Promise.resolve({ ok: false, status: 500 })),
		);

		await expect(prefetchWallets()).rejects.toThrow();
		expect(getWalletsPrefetchEntry()).toBeNull();
	});
});
