"use client";

import { Activity, BarChart3, RefreshCw, TrendingUp, Wallet } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { fetchOverview } from "@/lib/api";
import type { OverviewData } from "@/mock-data/overview";

export function DashboardOverview() {
	const [stats, setStats] = useState<OverviewData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchStats = async (showRefreshing = false) => {
		try {
			if (showRefreshing) {
				setIsRefreshing(true);
			} else {
				setIsLoading(true);
			}
			setError(null);

			setStats(await fetchOverview());
		} catch (err) {
			setError("Failed to load overview stats. Please try again.");
			console.error("Error fetching stats:", err);
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
		}
	};

	useEffect(() => {
		fetchStats();
	}, []);

	const handleRefresh = () => {
		fetchStats(true);
	};

	if (isLoading) {
		return (
			<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
				<CardSkeleton />
				<CardSkeleton />
				<CardSkeleton />
				<CardSkeleton />
				<CardSkeleton />
			</div>
		);
	}

	if (error) {
		return (
			<div
				role="alert"
				className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20"
			>
				<p className="text-sm text-red-800 dark:text-red-300">{error}</p>
				<Button
					variant="outline"
					size="sm"
					className="mt-3"
					onClick={() => fetchStats()}
				>
					Retry
				</Button>
			</div>
		);
	}

	if (!stats) {
		return (
			<EmptyState
				icon={<BarChart3 className="h-10 w-10 text-zinc-400 dark:text-zinc-500" />}
				title="No overview data yet"
				description="Dashboard metrics will appear here after wallets, transactions, or API requests are recorded."
				action={{ label: "Refresh overview", onClick: () => fetchStats(true) }}
			/>
		);
	}

	const lastUpdated = new Date(stats.lastUpdated);

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
						Overview
					</h2>
					<p className="text-sm text-zinc-500 dark:text-zinc-400">
						Last updated:{" "}
						{Number.isNaN(lastUpdated.getTime())
							? "Unknown"
							: lastUpdated.toLocaleTimeString()}
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={handleRefresh}
					disabled={isRefreshing}
					className="gap-2"
					aria-label="Refresh dashboard overview"
				>
					<RefreshCw
						className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
					/>
					{isRefreshing ? "Refreshing..." : "Refresh"}
				</Button>
			</div>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				<StatCard
					title="Total Wallets"
					value={stats.totalWallets}
					icon={<Wallet className="size-5" />}
					trend="+12%"
					trendUp
				/>
				<StatCard
					title="Active Wallets"
					value={stats.activeWallets}
					icon={<Activity className="size-5" />}
					trend="+8%"
					trendUp
				/>
				<StatCard
					title="Total Transactions"
					value={stats.totalTransactions}
					icon={<TrendingUp className="size-5" />}
					trend="+23%"
					trendUp
				/>
				<StatCard
					title="Total Volume"
					value={`${Number(stats.totalVolumeXlm).toLocaleString()} XLM`}
					icon={<TrendingUp className="size-5" />}
					trend="+15%"
					trendUp
				/>
				<StatCard
					title="API Requests Today"
					value={stats.apiRequestsToday.toLocaleString()}
					icon={<BarChart3 className="size-5" />}
					trend="Live"
					trendUp
				/>
			</div>
		</div>
	);
}

interface StatCardProps {
	title: string;
	value: number | string;
	icon: ReactNode;
	trend: string;
	trendUp: boolean;
}

function StatCard({ title, value, icon, trend, trendUp }: StatCardProps) {
	return (
		<div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
			<div className="flex items-center justify-between">
				<div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900">
					<div className="text-zinc-600 dark:text-zinc-400">{icon}</div>
				</div>
				<span
					className={`text-sm font-medium ${
						trendUp
							? "text-green-600 dark:text-green-400"
							: "text-red-600 dark:text-red-400"
					}`}
				>
					{trend}
				</span>
			</div>
			<div className="mt-4">
				<p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
					{title}
				</p>
				<p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
					{value}
				</p>
			</div>
		</div>
	);
}
