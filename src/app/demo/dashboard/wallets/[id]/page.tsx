"use client";

import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/button";
import { MaskedBalance } from "@/components/wallet/MaskedBalance";
import { NetworkBadge } from "@/components/wallet/NetworkBadge";
import { StatusIndicator } from "@/components/wallet/StatusIndicator";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useLiveBalance } from "@/hooks/useLiveBalance";
import { useWallet } from "@/hooks/useWallet";
import { formatDate } from "@/utils/dateFormatting";

function WalletDetailSkeleton() {
	return (
		<div className="animate-pulse space-y-6">
			<div className="h-8 w-64 rounded bg-zinc-200 dark:bg-zinc-800" />
			<div className="h-40 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
		</div>
	);
}

export default function WalletDetailPage() {
	const params = useParams<{ id: string }>();
	const id = params.id;

	const { wallet, loading, error, refetch } = useWallet(id);
	const { copy, copied } = useCopyToClipboard();

	// Live balance polling is only allowed for wallets we know are actively
	// in use; pending/inactive wallets have nothing meaningful to poll.
	const liveAllowed = wallet?.status === "active";
	const { balance, isLive } = useLiveBalance(
		id,
		wallet?.balance,
		liveAllowed,
	);

	return (
		<div className="min-h-screen bg-zinc-50 p-6 dark:bg-black md:p-12">
			<div className="mx-auto max-w-4xl space-y-8">
				<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
							Wallet Detail
						</h1>
						<p className="mt-1 text-zinc-500 dark:text-zinc-400">
							Inspect a single wallet&apos;s status and balance
						</p>
					</div>
					<Link
						href="/demo/dashboard/wallets"
						className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 shadow-xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
					>
						Back to Wallets
					</Link>
				</header>

				{loading && <WalletDetailSkeleton />}

				{!loading && error && (
					<ErrorState description={error} retry={{ onRetry: refetch }} />
				)}

				{!loading && !error && !wallet && (
					<EmptyState
						title="Wallet not found"
						description="We couldn't find a wallet with this id."
					/>
				)}

				{!loading && !error && wallet && (
					<div className="space-y-6">
						<div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
							<div className="flex flex-wrap items-center gap-3">
								<NetworkBadge network={wallet.network} />
								<StatusIndicator status={wallet.status} />
							</div>

							<div className="mt-4 flex items-center gap-2">
								<code className="rounded bg-zinc-100 px-3 py-1.5 font-mono text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
									{wallet.address}
								</code>
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={() => copy(wallet.address)}
									title={copied ? "Copied!" : "Copy address"}
								>
									{copied ? (
										<Check className="h-4 w-4 text-green-500" />
									) : (
										<Copy className="h-4 w-4" />
									)}
								</Button>
							</div>

							<div className="mt-8">
								<p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
									Balance
								</p>
								<div className="mt-2">
									<MaskedBalance balance={balance} isLive={isLive} />
								</div>
							</div>
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
								<p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
									Created
								</p>
								<p className="mt-1 text-zinc-900 dark:text-zinc-50">
									{formatDate(wallet.createdAt)}
								</p>
							</div>
							<div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
								<p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
									Last Activity
								</p>
								<p className="mt-1 text-zinc-900 dark:text-zinc-50">
									{formatDate(wallet.lastActivity)}
								</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
