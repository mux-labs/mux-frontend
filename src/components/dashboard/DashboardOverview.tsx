"use client";

import { RefreshCw, Wallet, Activity, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/ui/Skeleton";

interface OverviewStats {
	totalWallets: number;
	activeWallets: number;
	totalTransactions: number;
	totalVolume: string;
	lastUpdated: Date;
}

export function DashboardOverview() {
	const [stats, setStats] = useState<OverviewStats | null>(null);
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

			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Mock data - in production, this would come from the API
			const mockStats: OverviewStats = {
				totalWallets: 156,
				activeWallets: 142,
				totalTransactions: 2847,
				totalVolume: "$45,230.50",
				lastUpdated: new Date(),
			};

			setStats(mockStats);
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
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				<CardSkeleton />
				<CardSkeleton />
				<CardSkeleton />
				<CardSkeleton />
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
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

	if (!stats) return null;

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
						Overview
					</h2>
					<p className="text-sm text-zinc-500 dark:text-zinc-400">
						Last updated: {stats.lastUpdated.toLocaleTimeString()}
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={handleRefresh}
					disabled={isRefreshing}
					className="gap-2"
				>
					<RefreshCw
						className={`size-4 ${isRefreshing ? "animate-spin motion-reduce:animate-none" : ""}`}
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
					value={stats.totalVolume}
					icon={<TrendingUp className="size-5" />}
					trend="+15%"
					trendUp
				/>
			</div>
		</div>
	);
}

interface StatCardProps {
	title: string;
	value: number | string;
	icon: React.ReactNode;
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
