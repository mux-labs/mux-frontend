"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWalletById } from "@/lib/api";
import type { Wallet } from "@/types/wallet";

interface UseWalletByIdResult {
	wallet: Wallet | null;
	loading: boolean;
	error: string | null;
	refetch: () => void;
}

export function useWalletById(walletId: string): UseWalletByIdResult {
	const [wallet, setWallet] = useState<Wallet | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(() => {
		setLoading(true);
		setError(null);
		setWallet(null);

		fetchWalletById(walletId)
			.then(setWallet)
			.catch((err: unknown) => {
				setError(err instanceof Error ? err.message : "Failed to load wallet");
				setWallet(null);
			})
			.finally(() => setLoading(false));
	}, [walletId]);

	useEffect(() => {
		load();
	}, [load]);

	return { wallet, loading, error, refetch: load };
}
