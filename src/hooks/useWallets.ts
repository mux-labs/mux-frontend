"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api/config";
import type { Wallet } from "@/types/wallet";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { normalizeWallets } from "@/utils/walletSerialization";

export const WALLETS_RATE_LIMIT_MESSAGE =
	"You're making wallet requests too quickly. Please wait a moment, then try again.";

const WALLETS_CACHE_TTL_MS = 30_000;

type WalletsCacheEntry = {
	wallets: Wallet[];
	updatedAt: number;
};

type RefetchOptions = {
	force?: boolean;
};

export interface UseWalletsOptions {
	network?: WalletNetwork | "all";
}

interface UseWalletsResult {
	wallets: Wallet[];
	loading: boolean;
	error: string | null;
	refetch: (options?: RefetchOptions) => void;
	isCached: boolean;
}

const walletsCache = new Map<string, WalletsCacheEntry>();
const walletsRequests = new Map<string, Promise<Wallet[]>>();

function buildWalletsUrl(network: WalletNetwork | "all") {
	const base = getApiBaseUrl();
	const path = base ? `${base}/wallets` : "/api/wallets";
	if (network === "all") return path;

	const separator = path.includes("?") ? "&" : "?";
	return `${path}${separator}network=${encodeURIComponent(network)}`;
}

async function fetchWallets(network: WalletNetwork | "all") {
	const url = buildWalletsUrl(network);
	const res = await fetch(url);
	if (!res.ok) {
		if (res.status === 429) {
			throw new Error(WALLETS_RATE_LIMIT_MESSAGE);
		}
		throw new Error(`Request failed: ${res.status}`);
	}

	const data = (await res.json()) as Wallet[];
	return normalizeWallets(data);
}

export function invalidateWalletsCache(network?: WalletNetwork | "all") {
	if (!network || network === "all") {
		walletsCache.clear();
		walletsRequests.clear();
		return;
	}

	walletsCache.delete(network);
	walletsRequests.delete(network);
}

export function clearWalletsCacheForTests() {
	invalidateWalletsCache();
}

export function useWallets({
	network = "all",
}: UseWalletsOptions = {}): UseWalletsResult {
	const [wallets, setWallets] = useState<Wallet[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isCached, setIsCached] = useState(false);
	const [request, setRequest] = useState({ tick: 0, force: false });

	const refetch = useCallback((options: RefetchOptions = {}) => {
		setRequest((state) => ({
			tick: state.tick + 1,
			force: options.force ?? true,
		}));
	}, []);

	useEffect(() => {
		let cancelled = false;
		setError(null);

		const cacheKey = network;
		const cached = walletsCache.get(cacheKey);
		const cacheIsFresh =
			cached && Date.now() - cached.updatedAt < WALLETS_CACHE_TTL_MS;

		if (cacheIsFresh && !request.force) {
			setWallets(cached.wallets);
			setLoading(false);
			setIsCached(true);
			return () => {
				cancelled = true;
			};
		}

		setLoading(true);
		setIsCached(false);
		if (!cached) {
			setWallets([]);
		}

		const existingRequest = walletsRequests.get(cacheKey);
		const pendingRequest =
			existingRequest ??
			fetchWallets(network).finally(() => {
				walletsRequests.delete(cacheKey);
			});
		if (!existingRequest) {
			walletsRequests.set(cacheKey, pendingRequest);
		}

		pendingRequest
			.then((data) => {
				walletsCache.set(cacheKey, { wallets: data, updatedAt: Date.now() });
				if (!cancelled) setWallets(data);
			})
			.catch((err: unknown) => {
				if (!cancelled)
					setError(
						err instanceof Error ? err.message : "Failed to load wallets.",
					);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [network, request]);

	return { wallets, loading, error, refetch, isCached };
}
