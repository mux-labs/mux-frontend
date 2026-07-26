"use client";

import { useCallback, useEffect, useState } from "react";
import { AddWalletModal } from "@/components/wallet/AddWalletModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WalletTableSkeleton } from "@/components/ui/Skeleton";
import { Toast } from "@/components/ui/toast";
import { WalletTable } from "@/components/wallet/WalletTable";
import { useNetwork } from "@/context/NetworkContext";
import { useToast } from "@/hooks/useToast";
import { dummyWallets } from "@/mock-data/wallets";
import type { Wallet } from "@/types/wallet";

export default function WalletsPage() {
	const { network } = useNetwork();
	const [isLoading, setIsLoading] = useState(true);
	const [wallets, setWallets] = useState<Wallet[]>([]);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const { toast, showToast, hideToast } = useToast(3000);

	useEffect(() => {
		setIsLoading(true);
		const timer = setTimeout(() => {
			const filteredWallets = dummyWallets.filter((w) => w.network === network);
			setWallets(filteredWallets);
			setIsLoading(false);
		}, 800);

		return () => clearTimeout(timer);
	}, [network]);

	const handleWalletAdded = useCallback(
		(wallet: Wallet) => {
			setWallets((prev) => [wallet, ...prev]);
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
				<PageHeader
					title="Wallet Monitoring"
					description="Track and manage your Stellar wallets"
				/>

				{isLoading ? (
					<WalletTableSkeleton />
				) : wallets.length > 0 ? (
					<WalletTable
						wallets={wallets}
						onAddWallet={() => setIsModalOpen(true)}
						onCopySuccess={handleCopySuccess}
						onCopyError={handleCopyError}
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
