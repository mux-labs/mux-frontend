"use client";

import { useEffect, useState } from "react";
import { fetchWalletById } from "@/lib/api";

const POLL_INTERVAL_MS = 15_000;

interface UseLiveBalanceResult {
	balance: string | undefined;
	isLive: boolean;
}

/**
 * Polls a wallet's balance on an interval while `enabled` is true.
 * `enabled` is expected to reflect whether live polling is allowed for this
 * wallet (e.g. only "active" wallets), so callers control the gating.
 */
export function useLiveBalance(
	walletId: string,
	initialBalance: string | undefined,
	enabled: boolean,
): UseLiveBalanceResult {
	const [balance, setBalance] = useState(initialBalance);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setBalance(initialBalance);
	}, [initialBalance]);

	useEffect(() => {
		if (!enabled) return;

		let cancelled = false;

		const poll = () => {
			fetchWalletById(walletId)
				.then((wallet) => {
					if (!cancelled) setBalance(wallet.balance);
				})
				.catch(() => {
					// Keep last known balance on a transient poll failure.
				});
		};

		const intervalId = setInterval(poll, POLL_INTERVAL_MS);
		return () => {
			cancelled = true;
			clearInterval(intervalId);
		};
	}, [walletId, enabled]);

	return { balance, isLive: enabled };
}
