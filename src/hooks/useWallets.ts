"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWallets } from "@/lib/api";
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

	const load = useCallback(() => {
		setLoading(true);
		setError(null);
		fetchWallets()
			.then(setWallets)
			.catch((err: unknown) => {
				setError(err instanceof Error ? err.message : "Failed to load wallets");
				setWallets([]);
			})
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		load();
	}, [load]);

	return { wallets, loading, error, refetch: load };
}
