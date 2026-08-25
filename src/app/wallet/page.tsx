"use client";

import { AlertCircle, Check, Copy } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import TransactionsTable from "@/components/TransactionsTable/TransactionsTable";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ExplorerLink } from "@/components/ui/ExplorerLink";
import { Skeleton } from "@/components/ui/Skeleton";
import { NetworkBadge } from "@/components/wallet/NetworkBadge";
import ReceiveWalletModal from "@/components/wallet/ReceiveWalletModal";
import { SendWalletModal } from "@/components/wallet/SendWalletModal";
import { StatusIndicator } from "@/components/wallet/StatusIndicator";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useTransactions } from "@/hooks/useTransactions";
import { useWallets } from "@/hooks/useWallets";
import { isValidStellarAddress } from "@/utils/addressValidation";
import { formatDate } from "@/utils/dateFormatting";
import { isWalletFunded } from "@/utils/walletUtils";

function WalletPageContent() {
	const { wallets, loading, error, refetch } = useWallets();
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isReceiveOpen, setIsReceiveOpen] = useState(false);
	const [isSendOpen, setIsSendOpen] = useState(false);
	const { copy, copied, error: copyError } = useCopyToClipboard();

	const wallet = wallets?.[0] ?? null;
	const {
		transactions,
		loading: transactionsLoading,
		error: transactionsError,
		refetch: refetchTransactions,
	} = useTransactions(wallet?.address);
	const canReceive = !!wallet && isValidStellarAddress(wallet.address.trim());
	const receiveParam = searchParams.get("receive");

	useEffect(() => {
		setIsReceiveOpen(receiveParam === "1");
	}, [receiveParam]);

	const openReceive = () => {
		setIsReceiveOpen(true);
		router.replace(`${pathname}?receive=1`, { scroll: false });
	};

	const closeReceive = () => {
		setIsReceiveOpen(false);
		router.replace(pathname, { scroll: false });
	};

	return (
		<div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans p-4 sm:p-6 md:p-12">
			<div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
				<header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6 sm:mb-8">
					<div className="min-w-0">
						<h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
							Wallet Details
						</h1>
						{wallet ? (
							<p className="text-neutral-500 mt-1 break-all text-sm sm:text-base">
								{wallet.address}
							</p>
						) : (
							<p className="text-neutral-500 mt-1">
								Manage and view your wallet assets
							</p>
						)}
					</div>
					<div className="flex shrink-0 gap-3">
						<Link
							href="/"
							className="px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-lg shadow-xs hover:bg-neutral-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
						>
							Back to Dashboard
						</Link>
					</div>
				</header>

				{loading && (
					<section className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
						<div className="grid gap-6 sm:grid-cols-2">
							{Array.from({ length: 6 }).map((_, i) => (
								<div key={i} className="space-y-2">
									<Skeleton className="h-3 w-20" />
									<Skeleton className="h-5 w-32" />
								</div>
							))}
						</div>
					</section>
				)}

				{!loading && error && (
					<ErrorState description={error} retry={{ onRetry: refetch }} />
				)}

				{!loading && !error && !wallet && (
					<EmptyState
						title="No wallets found"
						description="You haven't added any wallets to monitor yet. Add your first wallet to start tracking."
						action={{ label: "Add Wallet", onClick: () => {} }}
					/>
				)}

				{!loading && wallet && (
					<section className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-8 shadow-sm space-y-6">
						<dl className="grid gap-4 sm:gap-6 sm:grid-cols-2">
							<div>
								<dt className="text-sm font-medium text-neutral-500">
									Network
								</dt>
								<dd className="mt-1">
									<NetworkBadge network={wallet.network} />
								</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-neutral-500">Status</dt>
								<dd className="mt-1">
									<StatusIndicator status={wallet.status} />
								</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-neutral-500">
									Balance
								</dt>
								<dd className="mt-1 font-mono text-neutral-900">
									{wallet.balance ?? "—"}
								</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-neutral-500">
									Created
								</dt>
								<dd className="mt-1 text-neutral-700">
									{formatDate(wallet.createdAt)}
								</dd>
							</div>
							{wallet.lastActivity && (
								<div>
									<dt className="text-sm font-medium text-neutral-500">
										Last Activity
									</dt>
									<dd className="mt-1 text-neutral-700">
										{formatDate(wallet.lastActivity)}
									</dd>
								</div>
							)}
							<div className="sm:col-span-2">
								<dt className="text-sm font-medium text-neutral-500">
									Address
								</dt>
								<dd className="mt-1">
									<div className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2">
										<code className="min-w-0 flex-1 break-all font-mono text-sm text-neutral-700">
											{wallet.address}
										</code>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => copy(wallet.address, wallet.address)}
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
											className="shrink-0 text-neutral-500 hover:text-neutral-700"
										>
											{copyError ? (
												<AlertCircle
													className="h-4 w-4 text-red-500"
													aria-hidden="true"
												/>
											) : copied ? (
												<Check
													className="h-4 w-4 text-green-600"
													aria-hidden="true"
												/>
											) : (
												<Copy className="h-4 w-4" aria-hidden="true" />
											)}
										</Button>
										<ExplorerLink
											address={wallet.address}
											network={wallet.network}
											type="account"
											size="icon-sm"
											showIcon
											title="View on Stellar Explorer"
										/>
									</div>
									{copyError && (
										<p role="alert" className="mt-1 text-xs text-red-600">
											{copyError}
										</p>
									)}
								</dd>
							</div>
						</dl>

						<div className="border-t border-neutral-200 pt-6">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<p className="text-sm font-medium text-neutral-900">
										Send or receive funds
									</p>
									<p className="text-sm text-neutral-500 mt-0.5">
										{isWalletFunded(wallet)
											? "Send tokens out or show the receive QR stub for incoming transfers."
											: "Show the receive QR stub or copy the address to accept incoming transfers."}
									</p>
								</div>
								<div className="flex flex-wrap gap-3">
									<Button
										disabled={!isWalletFunded(wallet)}
										onClick={() => setIsSendOpen(true)}
										title={
											isWalletFunded(wallet)
												? "Send funds from this wallet"
												: "Wallet must be funded to send"
										}
										aria-label={
											isWalletFunded(wallet)
												? "Send funds"
												: "Cannot send: wallet is not funded"
										}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											strokeWidth={2}
											stroke="currentColor"
											className="w-4 h-4"
											aria-hidden="true"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
											/>
										</svg>
										Send
									</Button>
									<Button
										variant="outline"
										onClick={openReceive}
										disabled={!canReceive}
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
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											strokeWidth={2}
											stroke="currentColor"
											className="w-4 h-4"
											aria-hidden="true"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M12 3v18m9-9H3"
											/>
										</svg>
										Receive
									</Button>
								</div>
							</div>
						</div>
					</section>
				)}

				{!loading && wallet && (
					<section className="mt-8">
						<TransactionsTable
							address={wallet.address}
							transactions={transactions}
							loading={transactionsLoading}
							error={transactionsError}
							onRetry={refetchTransactions}
						/>
					</section>
				)}
			</div>

			<ReceiveWalletModal
				isOpen={isReceiveOpen}
				wallet={wallet}
				onClose={closeReceive}
			/>
			<SendWalletModal
				isOpen={isSendOpen}
				wallet={wallet}
				onClose={() => setIsSendOpen(false)}
			/>
		</div>
	);
}

export default function WalletPage() {
	return (
		<Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
			<WalletPageContent />
		</Suspense>
	);
}
