import { fetchWalletById } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDate } from "@/utils/dateFormatting";
import { NetworkBadge } from "@/components/wallet/NetworkBadge";
import { StatusIndicator } from "@/components/wallet/StatusIndicator";
import Link from "next/link";

interface WalletDetailPageProps {
	params: {
		walletId: string;
	};
}

export default async function WalletDetailPage({ params }: WalletDetailPageProps) {
	const wallet = await fetchWalletById(params.walletId);

	if (!wallet) {
		return (
			<div className="min-h-screen bg-zinc-50 p-6 dark:bg-black md:p-12">
				<div className="mx-auto max-w-4xl">
					<EmptyState
						title="Wallet not found"
						description="The wallet you are looking for may have been removed or the link is invalid. Please return to the wallet list."
						action={{
							label: "Back to Wallets",
							onClick: () => {},
						}}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-zinc-50 p-6 dark:bg-black md:p-12">
			<div className="mx-auto max-w-5xl space-y-8">
				<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
							Wallet Details
						</h1>
						<p className="mt-1 text-zinc-500 dark:text-zinc-400">
							View wallet state and recent metadata for {wallet.address}.
						</p>
					</div>
					<Link
						href="/demo/dashboard/wallets"
						className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 shadow-xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
					>
						Back to Wallets
					</Link>
				</header>

				<section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
					<div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
						<div className="space-y-6">
							<div>
								<p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
									Wallet overview
								</p>
								<h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
									{wallet.network === "mainnet" ? "Mainnet Wallet" : "Testnet Wallet"}
								</h2>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
									<p className="text-sm text-zinc-500 dark:text-zinc-400">Address</p>
									<p className="mt-2 font-mono text-sm text-zinc-900 dark:text-zinc-100 break-all">
										{wallet.address}
									</p>
								</div>
								<div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
									<p className="text-sm text-zinc-500 dark:text-zinc-400">Status</p>
									<div className="mt-2">
										<StatusIndicator status={wallet.status} />
									</div>
								</div>
								<div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
									<p className="text-sm text-zinc-500 dark:text-zinc-400">Network</p>
									<div className="mt-2">
										<NetworkBadge network={wallet.network} />
									</div>
								</div>
								<div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
									<p className="text-sm text-zinc-500 dark:text-zinc-400">Created</p>
									<p className="mt-2 text-sm text-zinc-900 dark:text-zinc-100">
										{formatDate(wallet.createdAt)}
									</p>
								</div>
							</div>
							<div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
								<p className="text-sm text-zinc-500 dark:text-zinc-400">Last Activity</p>
								<p className="mt-2 text-sm text-zinc-900 dark:text-zinc-100">
									{wallet.lastActivity ? formatDate(wallet.lastActivity) : "No recent activity"}
								</p>
							</div>
						</div>
					</div>

					<div className="space-y-6">
						<div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
							<p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
								Wallet actions
							</p>
							<div className="mt-5 space-y-3">
								<button
									disabled
									className="w-full rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-left text-sm font-medium text-zinc-500 shadow-sm disabled:cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
								>
									Send funds is temporarily unavailable
								</button>
								<button
									disabled
									className="w-full rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-left text-sm font-medium text-zinc-500 shadow-sm disabled:cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
								>
									View transaction history
								</button>
							</div>
						</div>

						<div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
							<h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
								Status summary
							</h2>
							<p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
								The wallet detail view is read-only for now. If the selected wallet is invalid or disconnected, you will see a clear account message instead of a blank page.
							</p>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
