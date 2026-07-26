"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { WalletNetwork } from "@/types/wallet";

const STORAGE_KEY = "mux_network";
const VALID: WalletNetwork[] = ["mainnet", "testnet"];
const DEFAULT: WalletNetwork = "mainnet";

function readStored(): WalletNetwork {
	try {
		const v = localStorage.getItem(STORAGE_KEY);
		if (v && (VALID as string[]).includes(v)) return v as WalletNetwork;
	} catch {}
	return DEFAULT;
}

/** Shape of the value provided by {@link NetworkContext}. */
interface NetworkContextValue {
	/** The currently active Stellar network. */
	network: WalletNetwork;
	/**
	 * Update the active network. The new value is persisted to `localStorage`
	 * so it survives page refreshes.
	 *
	 * @param n - The network to activate (`"mainnet"` or `"testnet"`).
	 */
	setNetwork: (n: WalletNetwork) => void;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

/**
 * NetworkProvider wraps the application (or a subtree) and makes the active
 * Stellar network available to all descendants via {@link useNetwork}.
 *
 * - Reads the persisted network from `localStorage` on first mount.
 * - Falls back to `"mainnet"` when no valid value is stored or when
 *   `localStorage` is unavailable (e.g. SSR or private browsing).
 * - Persists every network change back to `localStorage`.
 *
 * @example
 * ```tsx
 * <NetworkProvider>
 *   <App />
 * </NetworkProvider>
 * ```
 */
export function NetworkProvider({ children }: { children: React.ReactNode }) {
	const [network, setNetworkState] = useState<WalletNetwork>(DEFAULT);

	useEffect(() => {
		setNetworkState(readStored());
	}, []);

	function setNetwork(n: WalletNetwork) {
		setNetworkState(n);
		try {
			localStorage.setItem(STORAGE_KEY, n);
		} catch {}
	}

	return (
		<NetworkContext.Provider value={{ network, setNetwork }}>
			{children}
		</NetworkContext.Provider>
	);
}

/**
 * Hook to access the active Stellar network and the function to change it.
 *
 * Must be called inside a {@link NetworkProvider}; throws otherwise.
 *
 * @returns `{ network, setNetwork }` — the current network and an updater.
 *
 * @example
 * ```tsx
 * const { network, setNetwork } = useNetwork();
 * // network === "mainnet" | "testnet"
 * ```
 *
 * @throws {Error} When called outside of `NetworkProvider`.
 */
export function useNetwork(): NetworkContextValue {
	const ctx = useContext(NetworkContext);
	if (!ctx) throw new Error("useNetwork must be used within NetworkProvider");
	return ctx;
}
