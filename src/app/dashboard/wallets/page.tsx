"use client";

import { useState } from "react";
import { AddWalletModal } from "@/components/wallet/AddWalletModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WalletTableSkeleton } from "@/components/ui/Skeleton";
import { WalletTable } from "@/components/wallet/WalletTable";
import { useNetwork } from "@/context/NetworkContext";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import { invalidateWalletsCache, useWallets } from "@/hooks/useWallets";
import type { Wallet } from "@/types/wallet";

export default function WalletsPage() {
	const { network } = useNetwork();
	const { wallets: fetchedWallets, loading, error, refetch } = useWallets({
		network,
	});
	const [addedWallets, setAddedWallets] = useState<Wallet[]>([]);
	const [isAddOpen, setIsAddOpen] = useState(false);
	useAnalyticsTracking("wallets");

	const wallets = [
		...addedWallets.filter((wallet) => wallet.network === network),
		...fetchedWallets,
	];

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
			<PageHeader
				title="Wallet Monitoring"
				description="Track and manage your Stellar wallets"
			/>

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
			) : wallets.length > 0 ? (
				<WalletTable wallets={wallets} onAddWallet={openAddWallet} />
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
