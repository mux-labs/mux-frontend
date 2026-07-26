"use client";

import { AlertCircle, Check, Copy, Pencil, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import TransactionsTable from "@/components/TransactionsTable/TransactionsTable";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ExplorerLink } from "@/components/ui/ExplorerLink";
import { Skeleton, WalletDetailSkeleton } from "@/components/ui/Skeleton";
import { TestnetHint } from "@/components/ui/TestnetHint";
import { NetworkBadge } from "@/components/wallet/NetworkBadge";
import ReceiveWalletModal from "@/components/wallet/ReceiveWalletModal";
import { SendWalletModal } from "@/components/wallet/SendWalletModal";
import { StatusIndicator } from "@/components/wallet/StatusIndicator";
import { WalletActivityFeed } from "@/components/wallet/WalletActivityFeed";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { trackWalletEvent } from "@/services/walletAnalyticsTracking";
import { truncateAddress } from "@/utils/addressFormatting";
import { isValidStellarAddress } from "@/utils/addressValidation";
import { formatDate } from "@/utils/dateFormatting";
import { isWalletFunded } from "@/utils/walletUtils";

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
	const [isSendOpen, setIsSendOpen] = useState(false);
	const [isReceiveOpen, setIsReceiveOpen] = useState(false);
	const [isEditingNickname, setIsEditingNickname] = useState(false);
	const [nickname, setNickname] = useState("");
	const [savedNickname, setSavedNickname] = useState("");
	const [nicknameStatus, setNicknameStatus] = useState<
		"idle" | "saving" | "error"
	>("idle");

	useEffect(() => {
		const nextNickname = wallet?.label ?? "";
		setNickname(nextNickname);
		setSavedNickname(nextNickname);
	}, [wallet?.label]);

	const canReceive = !!wallet && isValidStellarAddress(wallet.address.trim());
	const canSend = isWalletFunded(wallet);

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

	async function saveNickname(event: React.FormEvent) {
		event.preventDefault();
		const normalized = nickname.trim();
		if (normalized.length > 30 || /[<>"'&]/.test(normalized)) {
			setNicknameStatus("error");
			return;
		}
		setNicknameStatus("saving");
		try {
			const response = await fetch(`/api/wallets/${encodeURIComponent(id)}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ label: normalized }),
			});
			if (!response.ok) throw new Error("Unable to save nickname");
			setSavedNickname(normalized);
			setNickname(normalized);
			setIsEditingNickname(false);
			setNicknameStatus("idle");
		} catch {
			setNicknameStatus("error");
		}
	}

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
		<>
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
			</section>

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
						<div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
							<dt className="pt-2 text-sm text-zinc-500 dark:text-zinc-400">
								Nickname
							</dt>
							<dd className="w-full sm:max-w-xs">
								{isEditingNickname ? (
									<form onSubmit={saveNickname} className="space-y-1.5">
										<div className="flex gap-2">
											<label htmlFor={`${id}-nickname`} className="sr-only">
												Wallet nickname
											</label>
											<input
												id={`${id}-nickname`}
												value={nickname}
												onChange={(event) => {
													setNickname(event.target.value);
													setNicknameStatus("idle");
												}}
												maxLength={30}
												autoFocus
												placeholder="Add a nickname"
												className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
											/>
											<Button size="icon-sm" type="submit" disabled={nicknameStatus === "saving"} aria-label="Save nickname">
												<Check aria-hidden="true" />
											</Button>
											<Button
												size="icon-sm"
												variant="ghost"
												type="button"
												aria-label="Cancel nickname edit"
												onClick={() => {
													setNickname(savedNickname);
													setNicknameStatus("idle");
													setIsEditingNickname(false);
												}}
											>
												<X aria-hidden="true" />
											</Button>
										</div>
										{nicknameStatus === "error" && (
											<p role="alert" className="text-xs text-red-600 dark:text-red-400">
												Nickname could not be saved. Use at most 30 characters and try again.
											</p>
										)}
									</form>
								) : (
									<div className="flex items-center justify-end gap-2">
										<span className="text-sm text-zinc-700 dark:text-zinc-300">
											{savedNickname || "No nickname"}
										</span>
										<Button
											size="icon-sm"
											variant="ghost"
											aria-label="Edit wallet nickname"
											onClick={() => setIsEditingNickname(true)}
										>
											<Pencil aria-hidden="true" />
										</Button>
									</div>
								)}
							</dd>
						</div>
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
				</section>
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

			{wallet && (
				<section
					aria-label="Send or receive funds"
					className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
				>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
								Send or receive funds
							</p>
							<p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
								{canSend
									? "Send XLM out or show the receive QR stub for incoming transfers."
									: "Show the receive QR stub or copy the address to accept incoming transfers."}
							</p>
						</div>
						<div className="flex flex-wrap gap-3">
							<Button
								disabled={!canSend}
								onClick={() => setIsSendOpen(true)}
								title={
									canSend
										? "Send funds from this wallet"
										: "Wallet must be funded to send"
								}
								aria-label={
									canSend ? "Send funds" : "Cannot send: wallet is not funded"
								}
							>
								Send
							</Button>
							<Button
								variant="outline"
								disabled={!canReceive}
								onClick={() => setIsReceiveOpen(true)}
								title={
									canReceive
										? "Show receive QR stub"
										: "Wallet address is invalid"
								}
								aria-label={
									canReceive
										? "Receive funds"
										: "Cannot receive: wallet address is invalid"
								}
							>
								Receive
							</Button>
						</div>
					</div>
				</section>
			)}

			{wallet && <WalletActivityFeed address={wallet.address} />}

			{wallet && <TransactionsTable address={wallet.address} />}
		</div>

		<ReceiveWalletModal
			isOpen={isReceiveOpen}
			wallet={wallet}
			onClose={() => setIsReceiveOpen(false)}
		/>
		<SendWalletModal
			isOpen={isSendOpen}
			wallet={wallet}
			onClose={() => setIsSendOpen(false)}
		/>
		</>
	);
}
