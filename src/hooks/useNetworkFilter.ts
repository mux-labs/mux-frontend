import { useCallback, useState } from "react";
import type { WalletNetwork } from "@/types/wallet";

/**
 * Hook for managing network filter state
 *
 * Handles network switching behavior with the following features:
 * - Persists selected network in component state
 * - Validates network values and defaults to "all" if invalid
 * - Provides callbacks for network changes
 * - Supports filtering wallets by network
 *
 * @returns Object containing:
 *   - selectedNetwork: Current selected network ("all", "testnet", or "mainnet")
 *   - setSelectedNetwork: Function to update selected network
 *   - isNetworkSelected: Function to check if a network is selected
 *   - filterByNetwork: Function to filter wallets by selected network
 *
 * @example
 * const { selectedNetwork, setSelectedNetwork, filterByNetwork } = useNetworkFilter();
 * const filteredWallets = filterByNetwork(allWallets);
 *
 * @remarks
 * Only use `filterByNetwork` on a list that is *not* already network-scoped
 * (e.g. `useWallets({ network: "all" })`, or client-only data). If the list
 * came from a fetch already scoped to one network — as `useWallets({
 * network })` is, via a `?network=` query param — don't run it through this
 * hook too: a second, independently-driven filter on top of an
 * already-scoped fetch is double filtering. It can only ever agree with the
 * server-side scope or contradict it (e.g. selecting "testnet" here while
 * the fetch was scoped to "mainnet" produces a false "no results" state
 * instead of the mainnet data that was actually loaded). See the removal of
 * this exact bug from `/dashboard/wallets` (src/app/dashboard/wallets/page.tsx)
 * and `src/docs/API_Hooks.md`.
 */
export function useNetworkFilter() {
	const [selectedNetwork, setSelectedNetworkState] = useState<
		WalletNetwork | "all"
	>("all");

	/**
	 * Validates and sets the selected network
	 * Defaults to "all" if invalid value is provided
	 */
	const setSelectedNetwork = useCallback((network: WalletNetwork | "all") => {
		const validNetworks: (WalletNetwork | "all")[] = [
			"all",
			"testnet",
			"mainnet",
		];

		if (validNetworks.includes(network)) {
			setSelectedNetworkState(network);
		} else {
			// Gracefully handle invalid network values
			console.warn(`Invalid network value: ${network}. Defaulting to "all".`);
			setSelectedNetworkState("all");
		}
	}, []);

	/**
	 * Checks if a specific network is currently selected
	 */
	const isNetworkSelected = useCallback(
		(network: WalletNetwork | "all") => {
			return selectedNetwork === network;
		},
		[selectedNetwork],
	);

	/**
	 * Filters wallets based on selected network
	 * Returns all wallets if "all" is selected
	 */
	const filterByNetwork = useCallback(
		(wallets: Array<{ network: WalletNetwork }>) => {
			if (selectedNetwork === "all") {
				return wallets;
			}
			return wallets.filter((wallet) => wallet.network === selectedNetwork);
		},
		[selectedNetwork],
	);

	return {
		selectedNetwork,
		setSelectedNetwork,
		isNetworkSelected,
		filterByNetwork,
	};
}
