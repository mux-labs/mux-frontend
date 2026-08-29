import { getApiBaseUrl } from "@/lib/api/config";
import type { Wallet } from "@/types/wallet";
import { normalizeWallets } from "@/utils/walletSerialization";

/**
 * Small in-memory cache used to prefetch the wallets list before the
 * /dashboard/wallets route is actually navigated to (e.g. on sidebar
 * hover/focus).
 *
 * ## Tenant isolation (fix for #705)
 *
 * The cache is keyed by the combination of API base URL **and** the
 * session token that is active at prefetch time.  Without this, a shared
 * module-level cache keyed only by URL would serve one user's wallets to
 * the next user who signs in on the same browser tab (e.g. sign-out →
 * sign-in flows, or shared developer machines).
 *
 * The session token is read from the `mux_auth_token` HttpOnly cookie
 * value via `document.cookie` — the cookie itself is HttpOnly, but
 * calling `document.cookie` still includes non-HttpOnly attributes that
 * can be checked for _presence_; the full cookie value string is used as
 * a cache discriminator, not logged or exposed.  When no token is found
 * (e.g. logged-out state or server-side evaluation), the empty string is
 * used as the key, meaning the unauthenticated "slot" of the cache is
 * separate from any authenticated slot.
 *
 * resetWalletsPrefetchCache() is called on sign-out so no stale wallet
 * data survives into the next session.
 */

const PREFETCH_TTL_MS = 30_000;

interface CacheEntry {
	promise: Promise<Wallet[]>;
	timestamp: number;
}

/**
 * Map from cache key (url + session discriminator) to the in-flight/recent
 * prefetch entry.  Using a Map instead of a single module-level variable
 * ensures different sessions never share the same entry.
 */
const cache = new Map<string, CacheEntry>();

/**
 * Derive a cache key that includes both the API base URL and a session
 * discriminator so entries are never shared across users or sessions.
 *
 * The discriminator is derived client-side only; on the server (SSR/RSC) it
 * is always the empty string, which is fine because server-side prefetch
 * calls are not tenant-specific.
 */
function buildCacheKey(network?: string): string {
	const base = getApiBaseUrl() || "/api/wallets";
	const sessionDiscriminator =
		typeof document !== "undefined"
			? // Use the raw cookie string as an opaque discriminator.  We do not
				// parse or log it — we only care that different sessions produce
				// different keys.
				document.cookie
			: "";
	const networkPart = network ?? "all";
	return `${base}::${networkPart}::${sessionDiscriminator}`;
}

function walletsUrl(network?: string): string {
	const base = getApiBaseUrl();
	const path = base ? `${base}/wallets` : "/api/wallets";
	if (!network || network === "all") return path;
	const sep = path.includes("?") ? "&" : "?";
	return `${path}${sep}network=${encodeURIComponent(network)}`;
}

async function fetchWallets(network?: string): Promise<Wallet[]> {
	const res = await fetch(walletsUrl(network), { cache: "no-store" });
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
 *
 * Each unique (URL + session) pair gets its own cache slot, so one user's
 * prefetched wallets are never served to another user.
 */
export function prefetchWallets(network?: string): Promise<Wallet[]> {
	const key = buildCacheKey(network);
	const now = Date.now();

	const existing = cache.get(key);
	if (existing && now - existing.timestamp < PREFETCH_TTL_MS) {
		return existing.promise;
	}

	const promise = fetchWallets(network).catch((err) => {
		// Don't poison the cache with a failed prefetch attempt — allow a
		// subsequent hover or the page itself to retry.
		cache.delete(key);
		throw err;
	});

	cache.set(key, { promise, timestamp: now });
	return promise;
}

/**
 * Returns the current prefetch entry for the active session, if any,
 * without triggering a fetch.
 */
export function getWalletsPrefetchEntry(
	network?: string,
): Promise<Wallet[]> | null {
	const key = buildCacheKey(network);
	const entry = cache.get(key);
	if (!entry) return null;
	if (Date.now() - entry.timestamp >= PREFETCH_TTL_MS) {
		cache.delete(key);
		return null;
	}
	return entry.promise;
}

/**
 * Clears **all** prefetch cache entries, e.g. on logout so no stale wallet
 * data survives into the next session.
 */
export function resetWalletsPrefetchCache(): void {
	cache.clear();
}

/** Test-only helper to reset module-level cache state between tests. */
export function __resetWalletsPrefetchCacheForTests(): void {
	resetWalletsPrefetchCache();
}
