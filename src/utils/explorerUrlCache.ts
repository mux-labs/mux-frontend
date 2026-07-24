/**
 * Caches explorer base URLs keyed by network so repeated look-ups never
 * rebuild the URL string from scratch. The cache is populated lazily on first
 * access for each network / type combination and lives for the lifetime of the
 * module (i.e. the browser session).
 */

import type { ExplorerType } from "@/utils/explorerUrl";

type Network = "mainnet" | "testnet";

/** Raw base-URL map — single source of truth. */
const BASE_URLS: Record<ExplorerType, Record<Network, string>> = {
	address: {
		mainnet: "https://stellar.expert/explorer/public",
		testnet: "https://stellar.expert/explorer/testnet",
	},
	transaction: {
		mainnet: "https://stellar.expert/explorer/public/tx",
		testnet: "https://stellar.expert/explorer/testnet/tx",
	},
	account: {
		mainnet: "https://stellar.expert/explorer/public/account",
		testnet: "https://stellar.expert/explorer/testnet/account",
	},
};

/** In-memory cache: `"account:mainnet"` → `"https://…"` */
const cache = new Map<string, string>();

/**
 * Returns the explorer base URL for the given type and network.
 * The result is memoised so the same string reference is returned on every
 * subsequent call with the same arguments.
 *
 * @param type    - The resource type (`"account"`, `"transaction"`, or `"address"`).
 * @param network - The Stellar network (`"mainnet"` or `"testnet"`).
 * @returns Cached base URL string.
 *
 * @example
 * ```ts
 * const base = getCachedExplorerBaseUrl("account", "testnet");
 * // "https://stellar.expert/explorer/testnet/account"
 * ```
 */
export function getCachedExplorerBaseUrl(
	type: ExplorerType,
	network: Network,
): string {
	const key = `${type}:${network}`;
	if (!cache.has(key)) {
		cache.set(key, BASE_URLS[type][network]);
	}
	// biome-ignore lint/style/noNonNullAssertion: set just above
	return cache.get(key)!;
}

/**
 * Generates a full explorer URL using the cached base URL.
 * Drop-in companion to `getExplorerUrl` from `explorerUrl.ts` — identical
 * output, zero re-computation of the base on repeated calls.
 *
 * @param identifier - Stellar address or transaction hash.
 * @param network    - `"mainnet"` or `"testnet"`.
 * @param type       - Resource type (default `"account"`).
 * @returns Full explorer URL.
 */
export function getCachedExplorerUrl(
	identifier: string,
	network: Network,
	type: ExplorerType = "account",
): string {
	if (!identifier || !identifier.trim()) {
		throw new Error("Identifier cannot be empty");
	}
	const base = getCachedExplorerBaseUrl(type, network);
	return `${base}/${encodeURIComponent(identifier)}`;
}

/**
 * Clears the in-memory cache. Useful in tests or when the set of supported
 * networks changes at runtime.
 */
export function clearExplorerUrlCache(): void {
	cache.clear();
}
