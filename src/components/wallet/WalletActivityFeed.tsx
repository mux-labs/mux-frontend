"use client";

import { AlertCircle, ArrowDownRight, ArrowUpRight, Clock } from "lucide-react";
import { useMemo } from "react";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useTransactions } from "@/hooks/useTransactions";
import type { Transaction } from "@/types/transaction";

interface WalletActivityFeedProps {
	/** Wallet address to scope recent activity to. */
	address: string;
	/** Max number of items to show. */
	limit?: number;
}

function formatTimeAgo(iso: string): string {
	const diffMs = Date.now() - new Date(iso).getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return "Just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	return `${diffDays}d ago`;
}

function statusStyles(status: Transaction["status"]): string {
	switch (status) {
		case "completed":
			return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400";
		case "pending":
			return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
		case "failed":
			return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
		default:
			return "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-400";
	}
}

/**
 * Recent activity for a single wallet, derived from its transaction history.
 */
export function WalletActivityFeed({
	address,
	limit = 5,
}: WalletActivityFeedProps) {
	const { transactions, loading, error } = useTransactions(address);

	const scoped = useMemo(
		() =>
			transactions
				.filter((tx) => tx.from === address || tx.to === address)
				.sort(
					(a, b) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
				)
				.slice(0, limit),
		[transactions, address, limit],
	);

	if (loading) {
		return (
			<div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
				<div className="space-y-3">
					<CardSkeleton />
					<CardSkeleton />
					<CardSkeleton />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-xl border border-red-200 bg-red-50 p-4 sm:p-6 dark:border-red-800 dark:bg-red-900/20">
				<p className="flex items-center gap-2 text-sm text-red-800 dark:text-red-300">
					<AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
					{error}
				</p>
			</div>
		);
	}

	return (
		<section
			aria-label="Recent activity"
			className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
		>
			<div className="border-b border-zinc-200 p-4 sm:p-6 dark:border-zinc-800">
				<h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
					Recent Activity
				</h2>
			</div>
			{scoped.length === 0 ? (
				<div className="p-8 text-center">
					<Clock
						className="mx-auto mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-700"
						aria-hidden="true"
					/>
					<p className="text-sm text-zinc-500 dark:text-zinc-400">
						No recent activity for this wallet.
					</p>
				</div>
			) : (
				<ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
					{scoped.map((tx) => {
						const isOutgoing = tx.from === address;
						return (
							<li
								key={tx.hash}
								className="flex items-start gap-3 p-4 sm:p-6"
							>
								<div
									className={`shrink-0 rounded-lg p-2 ${statusStyles(tx.status)}`}
								>
									{isOutgoing ? (
										<ArrowUpRight className="h-4 w-4" aria-hidden="true" />
									) : (
										<ArrowDownRight className="h-4 w-4" aria-hidden="true" />
									)}
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
										{isOutgoing ? "Sent" : "Received"} {tx.amountXlm} XLM
									</p>
									<p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
										{formatTimeAgo(tx.createdAt)} · {tx.status}
									</p>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
