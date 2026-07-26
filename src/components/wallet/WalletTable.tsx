"use client";

import { AlertCircle, Check, Copy, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExplorerLink } from "@/components/ui/ExplorerLink";
import { TestnetHint } from "@/components/ui/TestnetHint";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { NetworkBadge } from "@/components/wallet/NetworkBadge";
import { StatusIndicator } from "@/components/wallet/StatusIndicator";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import type { WalletTableProps } from "@/types/wallet";
import { truncateAddress } from "@/utils/addressFormatting";
import { formatDate } from "@/utils/dateFormatting";

function WalletAddressCell({
	address,
	network,
}: {
	address: string;
	network: "mainnet" | "testnet";
}) {
	const { copy, copied, error } = useCopyToClipboard();

	const handleCopy = async () => {
		await copy(address, address);
	};

	return (
		<div className="flex items-center gap-1">
			<code className="rounded bg-zinc-100 px-2 py-1 font-mono text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
				{truncateAddress(address)}
			</code>
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={handleCopy}
				title={error ? error : copied ? "Copied!" : "Copy address"}
				disabled={error !== null}
			>
				{error ? (
					<AlertCircle className="h-4 w-4 text-red-500" />
				) : copied ? (
					<Check className="h-4 w-4 text-green-500" />
				) : (
					<Copy className="h-4 w-4" />
				)}
			</Button>
			<ExplorerLink
				address={address}
				network={network}
				type="account"
				size="icon-sm"
				showIcon
				title="View on Stellar Explorer"
			/>
		</div>
	);
}

export function WalletTable({ wallets, onAddWallet }: WalletTableProps) {
	const router = useRouter();
	const [focusedIndex, setFocusedIndex] = useState<number>(-1);
	const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

	const hasTestnetWallets = useMemo(
		() => wallets.some((wallet) => wallet.network === "testnet"),
		[wallets],
	);

	// Handle keyboard navigation
	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLTableRowElement>, index: number) => {
			switch (event.key) {
				case "ArrowDown":
					event.preventDefault();
					if (index < wallets.length - 1) {
						setFocusedIndex(index + 1);
						rowRefs.current[index + 1]?.focus();
					}
					break;
				case "ArrowUp":
					event.preventDefault();
					if (index > 0) {
						setFocusedIndex(index - 1);
						rowRefs.current[index - 1]?.focus();
					}
					break;
				case "Enter":
				case " ":
					event.preventDefault();
					router.push(`/demo/dashboard/wallets/${wallets[index].id}`);
					break;
				case "Home":
					event.preventDefault();
					setFocusedIndex(0);
					rowRefs.current[0]?.focus();
					break;
				case "End":
					event.preventDefault();
					const lastIndex = wallets.length - 1;
					setFocusedIndex(lastIndex);
					rowRefs.current[lastIndex]?.focus();
					break;
			}
		},
		[wallets, router],
	);

	// Handle row focus
	const handleRowFocus = useCallback((index: number) => {
		setFocusedIndex(index);
	}, []);

	// Handle row blur
	const handleRowBlur = useCallback(() => {
		setFocusedIndex(-1);
	}, []);

	return (
		<div className="space-y-4">
			{hasTestnetWallets && <TestnetHint variant="default" />}

			<div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-zinc-950/20">
				<div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-zinc-700 dark:bg-zinc-900/80">
					<div>
						<p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
							{wallets.length} wallet{wallets.length !== 1 ? "s" : ""}
						</p>
					</div>
					{onAddWallet && (
						<Button
							size="sm"
							onClick={onAddWallet}
							className="w-full rounded-full px-4 sm:w-auto"
						>
							<Plus className="h-4 w-4" aria-hidden="true" />
							Add Wallet
						</Button>
					)}
				</div>

				{wallets.length === 0 ? (
					<div className="py-12 text-center text-zinc-500 dark:text-zinc-400">
						No wallets found for this network.
					</div>
				) : (
					<>
						{/* Desktop Table View */}
						<div className="hidden lg:block">
							<Table className="dark:text-zinc-200">
								<TableHeader>
									<TableRow className="border-zinc-200 bg-zinc-50/80 hover:bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-800/70 dark:hover:bg-zinc-800/70">
										<TableHead className="text-zinc-700 dark:text-zinc-200">
											Address
										</TableHead>
										<TableHead className="text-zinc-700 dark:text-zinc-200">
											Network
										</TableHead>
										<TableHead className="text-zinc-700 dark:text-zinc-200">
											Status
										</TableHead>
										<TableHead className="text-zinc-700 dark:text-zinc-200">
											Balance
										</TableHead>
										<TableHead className="text-zinc-700 dark:text-zinc-200">
											Created
										</TableHead>
										<TableHead className="text-zinc-700 dark:text-zinc-200">
											Last Activity
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{wallets.map((wallet, index) => (
										<TableRow
											key={wallet.id}
											ref={(node) => {
												rowRefs.current[index] = node;
											}}
											tabIndex={0}
											data-state={
												focusedIndex === index ? "selected" : undefined
											}
											aria-label={`Open wallet ${truncateAddress(wallet.address)}`}
											onKeyDown={(event) => handleKeyDown(event, index)}
											onFocus={() => handleRowFocus(index)}
											onBlur={handleRowBlur}
											className="border-zinc-100 hover:bg-zinc-50/80 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
										>
											<TableCell>
												<Link
													href={`/demo/dashboard/wallets/${wallet.id}`}
													className="block"
												>
													<WalletAddressCell
														address={wallet.address}
														network={wallet.network}
													/>
												</Link>
											</TableCell>
											<TableCell>
												<Link
													href={`/demo/dashboard/wallets/${wallet.id}`}
													className="block"
												>
													<NetworkBadge network={wallet.network} />
												</Link>
											</TableCell>
											<TableCell>
												<Link
													href={`/demo/dashboard/wallets/${wallet.id}`}
													className="block"
												>
													<StatusIndicator status={wallet.status} />
												</Link>
											</TableCell>
											<TableCell>
												<Link
													href={`/demo/dashboard/wallets/${wallet.id}`}
													className="block text-zinc-700 dark:text-zinc-300"
												>
													{wallet.balance ?? "—"}
												</Link>
											</TableCell>
											<TableCell className="text-zinc-500 dark:text-zinc-400">
												<Link
													href={`/demo/dashboard/wallets/${wallet.id}`}
													className="block"
												>
													{formatDate(wallet.createdAt)}
												</Link>
											</TableCell>
											<TableCell className="text-zinc-500 dark:text-zinc-400">
												<Link
													href={`/demo/dashboard/wallets/${wallet.id}`}
													className="block"
												>
													{formatDate(wallet.lastActivity)}
												</Link>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>

						{/* Mobile Card View */}
						<div className="divide-y divide-zinc-100 lg:hidden dark:divide-zinc-800">
							{wallets.map((wallet) => (
								<Link
									key={wallet.id}
									href={`/demo/dashboard/wallets/${wallet.id}`}
									className="block p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
								>
									<div className="space-y-3">
										{/* Top row: Address and Badges */}
										<div className="flex items-start justify-between gap-2">
											<div className="min-w-0 flex-1">
												<WalletAddressCell
													address={wallet.address}
													network={wallet.network}
												/>
											</div>
											<div className="flex flex-shrink-0 gap-2">
												<NetworkBadge network={wallet.network} />
												<StatusIndicator status={wallet.status} />
											</div>
										</div>

										{/* Metadata grid */}
										<div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
											<div>
												<span className="text-zinc-500 dark:text-zinc-400">
													Balance
												</span>
												<p className="font-medium text-zinc-900 dark:text-zinc-50">
													{wallet.balance ?? "—"}
												</p>
											</div>
											<div>
												<span className="text-zinc-500 dark:text-zinc-400">
													Created
												</span>
												<p className="font-medium text-zinc-900 dark:text-zinc-50">
													{formatDate(wallet.createdAt)}
												</p>
											</div>
											{wallet.lastActivity && (
												<div className="col-span-2">
													<span className="text-zinc-500 dark:text-zinc-400">
														Last Activity
													</span>
													<p className="font-medium text-zinc-900 dark:text-zinc-50">
														{formatDate(wallet.lastActivity)}
													</p>
												</div>
											)}
										</div>
									</div>
								</Link>
							))}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
