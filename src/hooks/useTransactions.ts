"use client";

import { useCallback, useEffect, useState } from "react";
import type { Transaction } from "@/types/transaction";

interface UseTransactionsResult {
	transactions: Transaction[];
	loading: boolean;
	error: string | null;
	refetch: () => void;
}

export function useTransactions(address?: string): UseTransactionsResult {
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [tick, setTick] = useState(0);

	const refetch = useCallback(() => setTick((t) => t + 1), []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: tick is the refetch trigger
	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);

		const url = address
			? `/api/transactions?address=${encodeURIComponent(address)}`
			: "/api/transactions";

		fetch(url)
			.then((res) => {
				if (!res.ok) throw new Error(`Request failed: ${res.status}`);
				return res.json() as Promise<Transaction[]>;
			})
			.then((data) => {
				if (!cancelled) setTransactions(data);
			})
			.catch((err: unknown) => {
				if (!cancelled)
					setError(
						err instanceof Error ? err.message : "Failed to load transactions.",
					);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [tick, address]);

	return { transactions, loading, error, refetch };
}
