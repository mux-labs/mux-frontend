"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api/config";
import type { Wallet } from "@/types/wallet";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { normalizeWallets } from "@/utils/walletSerialization";

interface UseWalletsResult {
	wallets: Wallet[];
	loading: boolean;
	error: string | null;
	refetch: () => void;
}

export function useWallets(): UseWalletsResult {
	const [wallets, setWallets] = useState<Wallet[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [tick, setTick] = useState(0);

	const refetch = useCallback(() => setTick((t) => t + 1), []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: tick is the refetch trigger
	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);
		setWallets([]);

		const base = getApiBaseUrl();
		const url = base ? `${base}/wallets` : "/api/wallets";

		fetch(url)
			.then((res) => {
				if (!res.ok) throw new Error(`Request failed: ${res.status}`);
				return res.json() as Promise<Wallet[]>;
			})
			.then((data) => {
				if (!cancelled) setWallets(normalizeWallets(data));
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
	}, [tick]);

	return { wallets, loading, error, refetch };
}
