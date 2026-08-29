import { getApiBaseUrl } from "@/lib/api/config";
import { loadSession } from "@/lib/session";
import type { Wallet } from "@/types/wallet";
import { normalizeWallets } from "@/utils/walletSerialization";

/**
 * Small in-memory cache used to prefetch the wallets list before the
 * /dashboard/wallets route is actually navigated to (e.g. on sidebar
 * hover/focus). Works across testnet and mainnet since it simply proxies
 * whatever base URL `getApiBaseUrl()` currently resolves to.
 *
 * The cache is keyed by the current session's access token (see
 * `sessionKey()`), not just the request URL. Without that, a prefetch
 * started under one session (e.g. right before logout) could still be
 * within its TTL when a different user signs in on the same tab/device,
 * and would hand that second user the first user's already-resolved wallet
 * list — a cross-tenant data leak, not merely a stale-cache annoyance. Any
 * entry whose session key no longer matches the current one is treated as a
 * miss, independent of `resetWalletsPrefetchCache()` being called on logout.
 */

const PREFETCH_TTL_MS = 30_000;

interface CacheEntry {
	promise: Promise<Wallet[]>;
	timestamp: number;
	sessionKey: string;
}

let cacheEntry: CacheEntry | null = null;

function walletsUrl(): string {
	const base = getApiBaseUrl();
	return base ? `${base}/wallets` : "/api/wallets";
}

const ANONYMOUS_SESSION_KEY = "anonymous";

/** Identifies the signed-in session, if any, so cache entries never cross sessions. */
function sessionKey(): string {
	try {
		const session = loadSession() as { accessToken?: string } | null;
		return session?.accessToken
			? `token:${session.accessToken}`
			: ANONYMOUS_SESSION_KEY;
	} catch {
		return ANONYMOUS_SESSION_KEY;
	}
}

function authHeaders(key: string): Record<string, string> {
	return key.startsWith("token:")
		? { Authorization: `Bearer ${key.slice("token:".length)}` }
		: {};
}

async function fetchWallets(key: string): Promise<Wallet[]> {
	const res = await fetch(walletsUrl(), { headers: authHeaders(key) });
	if (!res.ok) {
		throw new Error(`Request failed: ${res.status}`);
	}
	const data = await res.json();
	return normalizeWallets(data);
}

/**
 * Kicks off (or reuses) an in-flight/recent wallets request for the
 * currently signed-in session. Safe to call multiple times in a row (e.g.
 * repeated hover events) without triggering duplicate network requests.
 */
export function prefetchWallets(): Promise<Wallet[]> {
	const now = Date.now();
	const key = sessionKey();

	if (
		cacheEntry &&
		cacheEntry.sessionKey === key &&
		now - cacheEntry.timestamp < PREFETCH_TTL_MS
	) {
		return cacheEntry.promise;
	}

	const promise = fetchWallets(key).catch((err) => {
		// Don't poison the cache with a failed prefetch attempt - allow a
		// subsequent hover or the page itself to retry.
		cacheEntry = null;
		throw err;
	});

	cacheEntry = { promise, timestamp: now, sessionKey: key };
	return promise;
}

/** Returns the current prefetch entry, if any, without triggering a fetch. */
export function getWalletsPrefetchEntry(): Promise<Wallet[]> | null {
	if (!cacheEntry) return null;
	if (Date.now() - cacheEntry.timestamp >= PREFETCH_TTL_MS) return null;
	if (cacheEntry.sessionKey !== sessionKey()) return null;
	return cacheEntry.promise;
}

/** Clears the in-memory prefetch cache, e.g. on logout so no stale wallet data survives into the next session. */
export function resetWalletsPrefetchCache(): void {
	cacheEntry = null;
}

/** Test-only helper to reset module-level cache state between tests. */
export function __resetWalletsPrefetchCacheForTests(): void {
	resetWalletsPrefetchCache();
}
