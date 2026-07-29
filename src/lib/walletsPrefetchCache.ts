import { getApiBaseUrl } from "@/lib/api/config";
import type { Wallet } from "@/types/wallet";
import { normalizeWallets } from "@/utils/walletSerialization";

/**
 * Small in-memory cache used to prefetch the wallets list before the
 * /dashboard/wallets route is actually navigated to (e.g. on sidebar
 * hover/focus). Works across testnet and mainnet since it simply proxies
 * whatever base URL `getApiBaseUrl()` currently resolves to.
 */

const PREFETCH_TTL_MS = 30_000;

interface CacheEntry {
	promise: Promise<Wallet[]>;
	timestamp: number;
}

let cacheEntry: CacheEntry | null = null;

function walletsUrl(): string {
	const base = getApiBaseUrl();
	return base ? `${base}/wallets` : "/api/wallets";
}

async function fetchWallets(): Promise<Wallet[]> {
	const res = await fetch(walletsUrl());
	if (!res.ok) {
		throw new Error(`Request failed: ${res.status}`);
	}
	const data = await res.json();
	return normalizeWallets(data);
}

/**
 * Kicks off (or reuses) an in-flight/recent wallets request. Safe to call
 * multiple times in a row (e.g. repeated hover events) without triggering
 * duplicate network requests.
 */
export function prefetchWallets(): Promise<Wallet[]> {
	const now = Date.now();

	if (cacheEntry && now - cacheEntry.timestamp < PREFETCH_TTL_MS) {
		return cacheEntry.promise;
	}

	const promise = fetchWallets().catch((err) => {
		// Don't poison the cache with a failed prefetch attempt - allow a
		// subsequent hover or the page itself to retry.
		cacheEntry = null;
		throw err;
	});

	cacheEntry = { promise, timestamp: now };
	return promise;
}

/** Returns the current prefetch entry, if any, without triggering a fetch. */
export function getWalletsPrefetchEntry(): Promise<Wallet[]> | null {
	if (!cacheEntry) return null;
	if (Date.now() - cacheEntry.timestamp >= PREFETCH_TTL_MS) return null;
	return cacheEntry.promise;
}

/** Test-only helper to reset module-level cache state between tests. */
export function __resetWalletsPrefetchCacheForTests(): void {
	cacheEntry = null;
}
