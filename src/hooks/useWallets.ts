"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api/config";
import {
	getWalletsPrefetchEntry,
	prefetchWallets,
} from "@/lib/walletsPrefetchCache";
import { dummyWallets } from "@/mock-data/wallets";
import type { Wallet, WalletNetwork } from "@/types/wallet";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { normalizeWallets } from "@/utils/walletSerialization";

function filterWalletsByNetwork(
	wallets: Wallet[],
	network: WalletNetwork | "all",
): Wallet[] {
	return network === "all"
		? wallets
		: wallets.filter((wallet) => wallet.network === network);
}

/** Reads the stored session token from localStorage (client-side only). */
function getStoredAccessToken(): string | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = localStorage.getItem("mux-auth-session");
		if (!raw) return null;
		const session = JSON.parse(raw) as { accessToken?: string };
		return session?.accessToken ?? null;
	} catch {
		return null;
	}
}

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
	/**
	 * When true, source wallets from local mock data instead of the real
	 * (auth-gated) wallets backend. Demo routes have no authenticated
	 * session to fetch for, so they pass `demo: true` here rather than
	 * hand-rolling their own mock filtering logic.
	 */
	demo?: boolean;
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

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	const token = getStoredAccessToken();
	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
	}

	const res = await fetchWithAuth(url, { headers });
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
	demo = false,
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
		if (demo) {
			// Demo mode: source wallets from local mock data rather than the
			// real (auth-gated) wallets backend.
			setError(null);
			setWallets(filterWalletsByNetwork(dummyWallets, network));
			setIsCached(false);
			setLoading(false);
			return;
		}

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
	}, [network, request, demo]);

	return { wallets, loading, error, refetch, isCached };
}
