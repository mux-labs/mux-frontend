"use client";

import { AlertCircle, Check, Copy, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useMemo, useRef, useState } from "react";
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
	onCopySuccess,
	onCopyError,
}: {
	address: string;
	network: "mainnet" | "testnet";
	onCopySuccess?: (address: string) => void;
	onCopyError?: (error: string) => void;
}) {
	const { copy, copied, error } = useCopyToClipboard();

	const handleCopy = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		const success = await copy(address, address);
		if (success) {
			onCopySuccess?.(address);
		} else {
			onCopyError?.(error ?? "Failed to copy address");
		}
	};

	return (
		<div className="flex items-center gap-1">
			<code className="rounded bg-zinc-100 px-2 py-1 font-mono text-sm text-zinc-700 transition-colors dark:bg-zinc-800 dark:text-zinc-300">
				{truncateAddress(address)}
			</code>
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={handleCopy}
				title={error ? error : copied ? "Copied!" : "Copy address"}
				disabled={error !== null}
				className="transition-all hover:scale-110"
				aria-label={
					copied ? "Address copied to clipboard" : "Copy address to clipboard"
				}
				data-testid="copy-address-button"
			>
				{error ? (
					<AlertCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
				) : copied ? (
					<Check
						className="h-4 w-4 text-green-500 animate-in fade-in zoom-in duration-200"
						aria-hidden="true"
					/>
				) : (
					<Copy
						className="h-4 w-4 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
						aria-hidden="true"
					/>
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

export function WalletTable({
	wallets,
	onAddWallet,
	onCopySuccess,
	onCopyError,
}: WalletTableProps) {
	const router = useRouter();
	const [focusedIndex, setFocusedIndex] = useState<number>(-1);
	const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
	const [toastOpen, setToastOpen] = useState(false);
	const [toastMessage, setToastMessage] = useState("");
	const [toastType, setToastType] = useState<"success" | "error">("success");
	const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const showToast = useCallback((message: string, type: "success" | "error") => {
		if (toastTimer.current) clearTimeout(toastTimer.current);
		setToastMessage(message);
		setToastType(type);
		setToastOpen(true);
		toastTimer.current = setTimeout(() => setToastOpen(false), 3000);
	}, []);

	const handleCopySuccess = useCallback((address: string) => {
		showToast(`Copied ${address.slice(0, 6)}…${address.slice(-4)}`, "success");
		onCopySuccess?.(address);
	}, [showToast, onCopySuccess]);

	const handleCopyError = useCallback((error: string) => {
		showToast(error, "error");
		onCopyError?.(error);
	}, [showToast, onCopyError]);

	const hasTestnetWallets = useMemo(
		() => wallets.some((wallet) => wallet.network === "testnet"),
		[wallets],
	);

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
				case "End": {
					event.preventDefault();
					const lastIndex = wallets.length - 1;
					setFocusedIndex(lastIndex);
					rowRefs.current[lastIndex]?.focus();
					break;
				}
			}
		},
		[wallets, router],
	);

	const handleRowFocus = useCallback((index: number) => {
		setFocusedIndex(index);
	}, []);

	const handleRowBlur = useCallback(() => {
		setFocusedIndex(-1);
	}, []);

	return (
		<div className="space-y-4">
			{hasTestnetWallets && <TestnetHint variant="default" />}

			<div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
				<div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-zinc-800">
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
					<div className="py-12 text-center text-zinc-500">
						No wallets found for this network.
					</div>
				) : (
					<>
						{/* Desktop Table View */}
						<div className="hidden lg:block">
							<Table>
								<TableHeader>
									<TableRow className="hover:bg-transparent dark:hover:bg-transparent">
										<TableHead>Address</TableHead>
										<TableHead>Network</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Balance</TableHead>
										<TableHead>Created</TableHead>
										<TableHead>Last Activity</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{wallets.map((wallet, index) => (
										<TableRow
											key={wallet.id}
											data-testid={`wallet-row-${index}`}
											tabIndex={0}
											ref={(el: HTMLTableRowElement | null) => {
												rowRefs.current[index] = el;
											}}
											onKeyDown={(e) => handleKeyDown(e, index)}
											onFocus={() => handleRowFocus(index)}
											onBlur={handleRowBlur}
											aria-label={`${truncateAddress(wallet.address)}, ${wallet.network}, ${wallet.status}`}
											className={
												focusedIndex === index
													? "ring-2 ring-blue-500 dark:ring-blue-400 focus:outline-none"
													: "focus:outline-none"
											}
										>
											<TableCell>
												<Link
													href={`/demo/dashboard/wallets/${wallet.id}`}
													className="block"
													tabIndex={-1}
												>
													<WalletAddressCell
														address={wallet.address}
														network={wallet.network}
														onCopySuccess={handleCopySuccess}
														onCopyError={handleCopyError}
													/>
												</Link>
											</TableCell>
											<TableCell>
												<Link
													href={`/demo/dashboard/wallets/${wallet.id}`}
													className="block"
													tabIndex={-1}
												>
													<NetworkBadge network={wallet.network} />
												</Link>
											</TableCell>
											<TableCell>
												<Link
													href={`/demo/dashboard/wallets/${wallet.id}`}
													className="block"
													tabIndex={-1}
												>
													<StatusIndicator status={wallet.status} />
												</Link>
											</TableCell>
											<TableCell>
												<Link
													href={`/demo/dashboard/wallets/${wallet.id}`}
													className="block text-zinc-700 dark:text-zinc-300"
													tabIndex={-1}
												>
													{wallet.balance ?? "—"}
												</Link>
											</TableCell>
											<TableCell className="text-zinc-500 dark:text-zinc-400">
												<Link
													href={`/demo/dashboard/wallets/${wallet.id}`}
													className="block"
													tabIndex={-1}
												>
													{formatDate(wallet.createdAt)}
												</Link>
											</TableCell>
											<TableCell className="text-zinc-500 dark:text-zinc-400">
												<Link
													href={`/demo/dashboard/wallets/${wallet.id}`}
													className="block"
													tabIndex={-1}
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
									className="block p-4 transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-800/50 dark:active:bg-zinc-800"
								>
									<div className="space-y-3">
										<div className="flex items-start justify-between gap-2">
											<div className="min-w-0 flex-1">
												<WalletAddressCell
													address={wallet.address}
													network={wallet.network}
													onCopySuccess={handleCopySuccess}
													onCopyError={handleCopyError}
												/>
											</div>
											<div className="flex flex-shrink-0 gap-2">
												<NetworkBadge network={wallet.network} />
												<StatusIndicator status={wallet.status} />
											</div>
										</div>

										<div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
											<div>
												<p className="text-xs text-zinc-500 dark:text-zinc-400">
													Balance
												</p>
												<p className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-50">
													{wallet.balance ?? "—"}
												</p>
											</div>
											<div>
												<p className="text-xs text-zinc-500 dark:text-zinc-400">
													Created
												</p>
												<p className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-50">
													{formatDate(wallet.createdAt)}
												</p>
											</div>
											{wallet.lastActivity && (
												<div className="col-span-2">
													<p className="text-xs text-zinc-500 dark:text-zinc-400">
														Last Activity
													</p>
													<p className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-50">
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
