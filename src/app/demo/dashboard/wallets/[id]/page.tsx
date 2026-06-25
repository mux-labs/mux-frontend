"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ErrorState } from "@/components/ui/ErrorState";
import { WalletTableSkeleton } from "@/components/wallet/WalletTableSkeleton";
import { useWalletById } from "@/hooks/useWalletById";
import { NetworkBadge } from "@/components/wallet/NetworkBadge";
import { StatusIndicator } from "@/components/wallet/StatusIndicator";
import { formatDate } from "@/utils/dateFormatting";

export default function WalletDetailPage() {
	const params = useParams();
	const walletId = params?.id as string;
	const { wallet, loading, error, refetch } = useWalletById(walletId);

	return (
		<div className="min-h-screen bg-zinc-50 p-6 dark:bg-black md:p-12">
			<div className="mx-auto max-w-6xl space-y-8">
				<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
							Wallet Details
						</h1>
						<p className="mt-1 text-zinc-500 dark:text-zinc-400">
							Review wallet configuration and status.
						</p>
					</div>
					<div className="flex gap-3">
						<Link
							href="/demo/dashboard/wallets"
							className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 shadow-xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
						>
							Back to Wallets
						</Link>
					</div>
				</header>

				{loading && <WalletTableSkeleton />}

				{!loading && error && (
					<ErrorState description={error} retry={{ onRetry: refetch, label: "Retry" }} />
				)}

				{!loading && !error && !wallet && (
					<ErrorState description="Wallet detail is unavailable." />
				)}

				{!loading && wallet && (
					<section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
						<div className="grid gap-8 lg:grid-cols-[1fr_320px]">
							<div className="space-y-6">
								<div className="rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-950">
									<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
										<div>
											<p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
												Wallet ID
											</p>
											<h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
												{wallet.id}
											</h2>
										</div>
										<div className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
										{wallet.address}
										</div>
									</div>
									<div className="grid gap-4 sm:grid-cols-2">
										<div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-zinc-950">
											<p className="text-sm text-zinc-500 dark:text-zinc-400">Network</p>
											<NetworkBadge network={wallet.network} />
										</div>
										<div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-zinc-950">
											<p className="text-sm text-zinc-500 dark:text-zinc-400">Status</p>
											<StatusIndicator status={wallet.status} />
										</div>
									</div>
								</div>

								<div className="space-y-4 rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-950">
									<div>
										<p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
											Wallet Summary
										</p>
									</div>
									<div className="grid gap-4 sm:grid-cols-2">
										<div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-zinc-950">
											<p className="text-sm text-zinc-500 dark:text-zinc-400">Created</p>
											<p className="mt-2 text-sm text-zinc-900 dark:text-zinc-50">
												{formatDate(wallet.createdAt)}
											</p>
										</div>
										<div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-zinc-950">
											<p className="text-sm text-zinc-500 dark:text-zinc-400">Last Activity</p>
											<p className="mt-2 text-sm text-zinc-900 dark:text-zinc-50">
												{wallet.lastActivity ? formatDate(wallet.lastActivity) : "No activity yet"}
											</p>
										</div>
									</div>
								</div>
							</div>

							<aside className="space-y-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
								<div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
									<p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Balance</p>
									<p className="mt-3 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
										{wallet.balance ?? "—"}
									</p>
								</div>
								<div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
									<p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Wallet Actions</p>
									<div className="mt-4 grid gap-3">
										<button disabled className="rounded-xl bg-zinc-100 px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
											Send funds
										</button>
										<button disabled className="rounded-xl bg-zinc-100 px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
											Receive funds
										</button>
									</div>
								</div>
							</aside>
						</div>
					</section>
				)}
			</div>
		</div>
	);
}
