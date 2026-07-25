"use client";

import { AlertCircle, Check, Copy, RefreshCw } from "lucide-react";
import { useCallback, useId } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ExplorerLink } from "@/components/ui/ExplorerLink";
import { Skeleton, WalletDetailSkeleton } from "@/components/ui/Skeleton";
import { TestnetHint } from "@/components/ui/TestnetHint";
import { NetworkBadge } from "@/components/wallet/NetworkBadge";
import { StatusIndicator } from "@/components/wallet/StatusIndicator";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { trackWalletEvent } from "@/services/walletAnalyticsTracking";
import { truncateAddress } from "@/utils/addressFormatting";
import { formatDate } from "@/utils/dateFormatting";

interface WalletDetailProps {
	id: string;
}

/**
 * Displays live balance and metadata for a single wallet.
 */
export function WalletDetail({ id }: WalletDetailProps) {
	const { wallet, balance, loading, error, lastUpdated, refresh } =
		useWalletBalance(id);
	const { copy, copied, error: copyError } = useCopyToClipboard();
	const { track } = useAnalyticsTracking("wallet_detail");
	const balanceHeadingId = useId();
	const infoHeadingId = useId();

	const isNotFound =
		!!error &&
		(error.toLowerCase().includes("not found") || error === "not_found");

	const handleRefresh = useCallback(() => {
		trackWalletEvent("wallet_balance_refresh", { walletId: id });
		track("wallet_balance_refresh", { walletId: id });
		refresh();
	}, [id, track, refresh]);

	const handleCopy = useCallback(
		(address: string) => {
			trackWalletEvent("wallet_address_copied", { walletId: id });
			track("wallet_address_copied", { walletId: id });
			copy(address);
		},
		[id, track, copy],
	);

	if (error && !wallet) {
		return (
			<ErrorState
				title={isNotFound ? "Wallet not found" : "Failed to load wallet"}
				description={
					isNotFound
						? "No wallet exists for this ID. It may have been removed or the link is invalid."
						: `${error}. Check your connection and try again.`
				}
				retry={
					isNotFound ? undefined : { label: "Try Again", onRetry: refresh }
				}
			/>
		);
	}

	if (!loading && !wallet) {
		return (
			<EmptyState
				title="No wallet data"
				description="This wallet has no data to display yet."
			/>
		);
	}

	return (
		<div className="space-y-4 sm:space-y-6">
			{wallet?.network === "testnet" && (
				<TestnetHint
					variant="compact"
					dismissible={false}
					address={wallet.address}
				/>
			)}

			{/* Balance card */}
			<section
				aria-labelledby={balanceHeadingId}
				className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
			>
				<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
					<h2
						id={balanceHeadingId}
						className="text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
					>
						Live Balance
					</h2>
					<div className="flex shrink-0 items-center gap-2">
						{lastUpdated && (
							<span className="min-w-0 truncate text-xs text-zinc-400 dark:text-zinc-500">
								Updated {formatDate(lastUpdated)}
							</span>
						)}
						<button
							type="button"
							onClick={handleRefresh}
							disabled={loading}
							aria-label="Refresh balance"
							aria-busy={loading ? "true" : undefined}
							className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
						>
							<RefreshCw
								className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
								aria-hidden="true"
							/>
						</button>
					</div>
				</div>

				{loading && !balance ? (
					<Skeleton className="h-12 w-48" aria-hidden="true" />
				) : (
					<p
						className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50"
						aria-live="polite"
						aria-atomic="true"
					>
						{balance ?? "—"}
					</p>
				)}

				{error && wallet && (
					<p
						role="alert"
						className="mt-2 text-sm text-red-600 dark:text-red-400"
					>
						{error}
					</p>
				)}
			</div>

			{/* Wallet metadata */}
			{wallet ? (
				<section
					aria-labelledby={infoHeadingId}
					className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
				>
					<h2
						id={infoHeadingId}
						className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
					>
						Wallet Info
					</h2>
					<dl className="space-y-4">
						<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
							<dt className="text-sm text-zinc-500 dark:text-zinc-400">
								Address
							</dt>
							<dd className="flex min-w-0 items-center gap-2">
								<code className="min-w-0 truncate rounded bg-zinc-100 px-2 py-1 font-mono text-sm text-zinc-700 sm:max-w-[200px] dark:bg-zinc-800 dark:text-zinc-300">
									{truncateAddress(wallet.address)}
								</code>
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={() => handleCopy(wallet.address)}
									disabled={!!copyError}
									aria-label={
										copyError
											? copyError
											: copied
												? "Address copied"
												: "Copy wallet address"
									}
									title={
										copyError
											? copyError
											: copied
												? "Copied!"
												: "Copy address"
									}
								>
									{copyError ? (
										<AlertCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
									) : copied ? (
										<Check className="h-4 w-4 text-green-500" aria-hidden="true" />
									) : (
										<Copy className="h-4 w-4" aria-hidden="true" />
									)}
								</Button>
								{copyError && (
									<p role="alert" className="sr-only">
										{copyError}
									</p>
								)}
								<ExplorerLink
									address={wallet.address}
									network={wallet.network}
									type="account"
									size="icon-sm"
									showIcon
									title="View on Stellar Explorer"
								/>
							</dd>
						</div>
						<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
							<dt className="text-sm text-zinc-500 dark:text-zinc-400">
								Network
							</dt>
							<dd>
								<NetworkBadge network={wallet.network} />
							</dd>
						</div>
						<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
							<dt className="text-sm text-zinc-500 dark:text-zinc-400">
								Status
							</dt>
							<dd>
								<StatusIndicator status={wallet.status} />
							</dd>
						</div>
						<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
							<dt className="text-sm text-zinc-500 dark:text-zinc-400">
								Created
							</dt>
							<dd className="text-sm text-zinc-700 dark:text-zinc-300">
								{formatDate(wallet.createdAt)}
							</dd>
						</div>
						{wallet.lastActivity && (
							<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
								<dt className="text-sm text-zinc-500 dark:text-zinc-400">
									Last Activity
								</dt>
								<dd className="text-sm text-zinc-700 dark:text-zinc-300">
									{formatDate(wallet.lastActivity)}
								</dd>
							</div>
						)}
					</dl>
				</div>
			) : (
				<div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
					<Skeleton className="mb-4 h-4 w-24" />
					<div className="space-y-4">
						{[...Array(4)].map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
							<div key={i} className="flex items-center justify-between">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-6 w-32" />
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
