"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WalletTableSkeleton } from "@/components/ui/Skeleton";
import { AddWalletModal } from "@/components/wallet/AddWalletModal";
import { WalletTable } from "@/components/wallet/WalletTable";
import { useNetwork } from "@/context/NetworkContext";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import { invalidateWalletsCache, useWallets } from "@/hooks/useWallets";
import type { Wallet } from "@/types/wallet";

export default function WalletsPage() {
	// `network` (from the global TopNav switcher) is the single source of
	// truth for which network's wallets are shown on this page. useWallets
	// sends it as a `?network=` query param, so the backend already returns
	// only wallets for the active network — there is no separate "all
	// networks" view to additionally filter for here. (Previously this page
	// also ran a second, independent "all/testnet/mainnet" client-side
	// filter on top of that already-scoped data via useNetworkFilter +
	// NetworkFilter, which — since the fetch is never actually scoped to
	// "all" — could only ever agree with the server-side scoping or
	// contradict it (e.g. selecting "testnet" while the global switcher was
	// on "mainnet" produced a false "no wallets on this network" empty
	// state instead of just showing the mainnet wallets that were already
	// loaded). See the ticket for the removed double-filtering bug.)
	const { network } = useNetwork();
	const {
		wallets: fetchedWallets,
		loading,
		error,
		refetch,
	} = useWallets({
		network,
	});
	const [addedWallets, setAddedWallets] = useState<Wallet[]>([]);
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [showArchived, setShowArchived] = useState(false);
	useAnalyticsTracking("wallets");

	// Combine optimistically-added wallets (scoped to current network) with fetched ones
	const wallets = useMemo(
		() => [
			...addedWallets.filter((wallet) => wallet.network === network),
			...fetchedWallets,
		],
		[addedWallets, fetchedWallets, network],
	);

	const archivedCount = useMemo(
		() => wallets.filter((w) => w.archived).length,
		[wallets],
	);

	const visibleWallets = useMemo(
		() => (showArchived ? wallets : wallets.filter((w) => !w.archived)),
		[wallets, showArchived],
	);

	const openAddWallet = () => setIsAddOpen(true);
	const isRateLimited = error?.includes("too quickly") ?? false;

	const handleAdd = (wallet: Wallet) => {
		setAddedWallets((prev) => [wallet, ...prev]);
		invalidateWalletsCache(wallet.network);
		refetch({ force: true });
		setIsAddOpen(false);
	};

	return (
		<div className="space-y-8">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<PageHeader
					title="Wallet Monitoring"
					description="Track and manage your Stellar wallets"
				/>
				{!loading && archivedCount > 0 && (
					<label className="flex shrink-0 items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
						<input
							type="checkbox"
							checked={showArchived}
							onChange={(event) => setShowArchived(event.target.checked)}
							data-testid="show-archived-toggle"
							className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
						/>
						Show archived ({archivedCount})
					</label>
				)}
			</div>

			{loading ? (
				<WalletTableSkeleton />
			) : error && wallets.length === 0 ? (
				<ErrorState
					title={
						isRateLimited
							? "Wallets are temporarily rate limited"
							: "Failed to load wallets"
					}
					description={
						isRateLimited
							? error
							: `${error} Check your connection and try again.`
					}
					retry={{ label: "Retry", onRetry: refetch }}
				/>
			) : visibleWallets.length > 0 ? (
				<WalletTable wallets={visibleWallets} onAddWallet={openAddWallet} />
			) : wallets.length > 0 ? (
				<EmptyState
					title="No wallets to show"
					description={`All of your wallets are archived. Toggle "Show archived" to see them.`}
				/>
			) : (
				<EmptyState
					title="No wallets found"
					description="You haven't added any wallets to monitor yet. Add your first wallet to start tracking."
					action={{
						label: "Add Wallet",
						onClick: openAddWallet,
					}}
				/>
			)}

			<AddWalletModal
				isOpen={isAddOpen}
				onClose={() => setIsAddOpen(false)}
				onAdd={handleAdd}
				existingAddresses={wallets.map((wallet) => wallet.address)}
			/>
		</div>
	);
}
