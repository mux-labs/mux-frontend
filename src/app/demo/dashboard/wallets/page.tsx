"use client";

import { useCallback, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WalletTableSkeleton } from "@/components/ui/Skeleton";
import { Toast } from "@/components/ui/toast";
import { AddWalletModal } from "@/components/wallet/AddWalletModal";
import { NetworkFilter } from "@/components/wallet/NetworkFilter";
import { WalletTable } from "@/components/wallet/WalletTable";
import { useNetwork } from "@/context/NetworkContext";
import { useNetworkFilter } from "@/hooks/useNetworkFilter";
import { useToast } from "@/hooks/useToast";
import { useWallets } from "@/hooks/useWallets";
import type { Wallet } from "@/types/wallet";

export default function WalletsPage() {
	const { network } = useNetwork();
	// `demo: true` tells useWallets to source mock wallet data itself instead
	// of hitting the real (auth-gated) wallets backend — the demo route has
	// no authenticated session to fetch for. Everything below (network filter,
	// archived toggle, optimistic add) mirrors the production
	// `/dashboard/wallets` page so the two stay behaviourally aligned.
	const { wallets: fetchedWallets, loading: isLoading } = useWallets({
		network,
		demo: true,
	});
	const [addedWallets, setAddedWallets] = useState<Wallet[]>([]);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [showArchived, setShowArchived] = useState(false);
	const { selectedNetwork, setSelectedNetwork, filterByNetwork } =
		useNetworkFilter();
	const { toast, showToast, hideToast } = useToast(3000);

	// Combine optimistically-added wallets (scoped to current network) with
	// the wallets returned by useWallets.
	const wallets = useMemo(
		() => [
			...addedWallets.filter((wallet) => wallet.network === network),
			...fetchedWallets,
		],
		[addedWallets, fetchedWallets, network],
	);

	// Apply network filter then archived filter (same order as production).
	const networkFilteredWallets = useMemo(
		() => filterByNetwork(wallets),
		[filterByNetwork, wallets],
	);

	const archivedCount = useMemo(
		() => networkFilteredWallets.filter((w) => w.archived).length,
		[networkFilteredWallets],
	);

	const visibleWallets = useMemo(
		() =>
			showArchived
				? networkFilteredWallets
				: networkFilteredWallets.filter((w) => !w.archived),
		[networkFilteredWallets, showArchived],
	);

	const handleWalletAdded = useCallback(
		(wallet: Wallet) => {
			setAddedWallets((prev) => [wallet, ...prev]);
			setIsModalOpen(false);
			showToast(
				`${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)} added successfully.`,
			);
		},
		[showToast],
	);

	const handleCopySuccess = useCallback(
		(_address: string) => {
			showToast("Address copied to clipboard.");
		},
		[showToast],
	);

	const handleCopyError = useCallback(
		(error: string) => {
			showToast(error, { variant: "error", title: "Copy failed" });
		},
		[showToast],
	);

	return (
		<>
			<div className="space-y-8">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<PageHeader
						title="Wallet Monitoring"
						description="Track and manage your Stellar wallets"
					/>
					{!isLoading && archivedCount > 0 && (
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

				{/* Network filter — client-side filter on top of the network-scoped fetch */}
				{!isLoading && (
					<NetworkFilter
						selectedNetwork={selectedNetwork}
						onNetworkChange={setSelectedNetwork}
					/>
				)}

				{isLoading ? (
					<WalletTableSkeleton />
				) : visibleWallets.length > 0 ? (
					<WalletTable
						wallets={visibleWallets}
						onAddWallet={() => setIsModalOpen(true)}
						onCopySuccess={handleCopySuccess}
						onCopyError={handleCopyError}
					/>
				) : wallets.length > 0 && networkFilteredWallets.length === 0 ? (
					<EmptyState
						title="No wallets on this network"
						description={`No wallets found for the selected network filter. Try selecting "All Networks".`}
						action={{
							label: "Show all networks",
							onClick: () => setSelectedNetwork("all"),
						}}
					/>
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
							onClick: () => setIsModalOpen(true),
						}}
					/>
				)}
			</div>

			<AddWalletModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onAdd={handleWalletAdded}
				existingAddresses={wallets.map((w) => w.address)}
			/>

			<Toast
				open={toast.open}
				message={toast.message}
				variant={toast.variant}
				title={toast.title}
				onClose={hideToast}
			/>
		</>
	);
}
