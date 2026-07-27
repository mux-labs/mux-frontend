"use client";

import { useCallback, useEffect, useState } from "react";
import {
	getWalletsPrefetchEntry,
	prefetchWallets,
} from "@/lib/walletsPrefetchCache";
import type { Wallet } from "@/types/wallet";

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

		// On the initial mount, reuse an in-flight/recent prefetch (e.g. one
		// kicked off by hovering the sidebar Wallets link) instead of firing a
		// duplicate request. Manual refetches always hit the network.
		const existingPrefetch = tick === 0 ? getWalletsPrefetchEntry() : null;
		const request = existingPrefetch ?? prefetchWallets();

		request
			.then((data) => {
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
	}, [tick]);

	return { wallets, loading, error, refetch };
}
