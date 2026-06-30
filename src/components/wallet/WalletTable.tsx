"use client";

import { AlertCircle, Check, Copy, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExplorerLink } from "@/components/ui/ExplorerLink";
import { TestnetHint } from "@/components/ui/TestnetHint";
import { Toast } from "@/components/ui/toast";
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

		try {
			await copy(address, address);
			// Success callback will be triggered by effect monitoring copied state
		} catch (err) {
			// Error will be set in hook state
			const errorMessage =
				err instanceof Error ? err.message : "Failed to copy";
			if (onCopyError) {
				onCopyError(errorMessage);
			}
		}
	};

	// Trigger success callback when copied changes to true
	useEffect(() => {
		if (copied && onCopySuccess) {
			onCopySuccess(address);
		}
	}, [copied, address, onCopySuccess]);

	// Trigger error callback when error is set
	useEffect(() => {
		if (error && onCopyError) {
			onCopyError(error);
		}
	}, [error, onCopyError]);

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
	const [toastOpen, setToastOpen] = useState(false);
	const [toastMessage, setToastMessage] = useState("");
	const [toastType, setToastType] = useState<"success" | "error">("success");
	const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

	const hasTestnetWallets = useMemo(
		() => wallets.some((wallet) => wallet.network === "testnet"),
		[wallets],
	);

	// Toast management: show and auto-dismiss
	const showToast = useCallback(
		(message: string, type: "success" | "error", duration = 3000) => {
			// Clear existing timeout if any
			if (toastTimeoutRef.current) {
				clearTimeout(toastTimeoutRef.current);
			}

			// Show toast
			setToastMessage(message);
			setToastType(type);
			setToastOpen(true);

			// Auto-dismiss after duration
			toastTimeoutRef.current = window.setTimeout(() => {
				setToastOpen(false);
				toastTimeoutRef.current = null;
			}, duration);
		},
		[],
	);

	// Handle copy success - trigger success toast
	const handleCopySuccess = useCallback(
		(address: string) => {
			showToast(`Copied address: ${address}`, "success");
			// Also call the parent callback if provided
			onCopySuccess?.(address);
		},
		[showToast, onCopySuccess],
	);

	// Handle copy error - trigger error toast
	const handleCopyError = useCallback(
		(error: string) => {
			showToast(`Copy failed: ${error}`, "error");
			// Also call the parent callback if provided
			onCopyError?.(error);
		},
		[showToast, onCopyError],
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

	// Handle row focus
	const handleRowFocus = useCallback((index: number) => {
		setFocusedIndex(index);
	}, []);

	// Handle row blur
	const handleRowBlur = useCallback(() => {
		setFocusedIndex(-1);
	}, []);

	// Cleanup: clear toast timeout on unmount
	useEffect(() => {
		return () => {
			if (toastTimeoutRef.current) {
				clearTimeout(toastTimeoutRef.current);
			}
		};
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
					<EmptyState
						title="No wallets found"
						description="No wallets found for this network."
					/>
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
									{wallets.map((wallet) => (
										<TableRow key={wallet.id}>
											<TableCell>
												<Link
													href={`/demo/dashboard/wallets/${wallet.id}`}
													className="block"
												>
													<WalletAddressCell
														address={wallet.address}
														network={wallet.network}
														onCopySuccess={onCopySuccess}
														onCopyError={onCopyError}
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
													onCopySuccess={handleCopySuccess}
													onCopyError={handleCopyError}
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

			{/* Toast notification for copy feedback */}
			<CopyToast open={toastOpen} message={toastMessage} type={toastType} />
		</div>
	);
}

interface CopyToastProps {
	open: boolean;
	message: string;
	type: "success" | "error";
}

function CopyToast({ open, message, type }: CopyToastProps) {
	if (!open) {
		return null;
	}

	return (
		<div
			className="fixed right-4 bottom-4 z-50 max-w-sm rounded-lg bg-zinc-950/95 p-4 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md animate-in slide-in-from-bottom-5 fade-in duration-300"
			role="status"
			aria-live="polite"
			data-testid="copy-toast"
		>
			<div className="flex items-start gap-3">
				{type === "success" ? (
					<Check
						className="h-5 w-5 text-green-400 flex-shrink-0"
						aria-hidden="true"
					/>
				) : (
					<AlertCircle
						className="h-5 w-5 text-red-400 flex-shrink-0"
						aria-hidden="true"
					/>
				)}
				<div className="space-y-1 flex-1 min-w-0">
					<p className="text-sm font-semibold">
						{type === "success" ? "Copied!" : "Copy Failed"}
					</p>
					<p className="text-sm text-zinc-200 break-words">{message}</p>
				</div>
			</div>
		</div>
	);
}
