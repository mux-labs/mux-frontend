"use client";

import { useState } from "react";
import { AddWalletModal } from "@/components/wallet/AddWalletModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WalletTable } from "@/components/wallet/WalletTable";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import { dummyWallets } from "@/mock-data/wallets";
import type { Wallet } from "@/types/wallet";

export default function WalletsPage() {
	const [wallets, setWallets] = useState<Wallet[]>(dummyWallets);
	const [isAddOpen, setIsAddOpen] = useState(false);
	useAnalyticsTracking("wallets");

	const openAddWallet = () => setIsAddOpen(true);

	const handleAdd = (wallet: Wallet) => {
		setWallets((prev) => [wallet, ...prev]);
		setIsAddOpen(false);
	};

	return (
		<div className="space-y-8">
			<PageHeader
				title="Wallet Monitoring"
				description="Track and manage your Stellar wallets"
			/>

			{wallets.length > 0 ? (
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
			/>
		</div>
	);
}
