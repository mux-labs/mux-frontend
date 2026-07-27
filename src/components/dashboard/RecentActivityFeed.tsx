"use client";

import {
	AlertCircle,
	ArrowUpRight,
	Clock,
	Key,
	Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchRecentActivity, type ActivityItem } from "@/lib/api";

export function RecentActivityFeed() {
	const [activities, setActivities] = useState<ActivityItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchActivities = async () => {
		try {
			setIsLoading(true);
			setError(null);

			setActivities(await fetchRecentActivity());
		} catch (err) {
			setError("Failed to load recent activity. Please try again.");
			console.error("Error fetching activities:", err);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchActivities();
	}, []);

	const formatTimeAgo = (timestamp: string) => {
		const date = new Date(timestamp);
		if (Number.isNaN(date.getTime())) return "Unknown time";

		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return "Just now";
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		return `${diffDays}d ago`;
	};

	const getActivityIcon = (type: ActivityItem["type"]) => {
		switch (type) {
			case "wallet_created":
				return <Wallet className="size-4" />;
			case "transaction":
				return <ArrowUpRight className="size-4" />;
			case "api_key_created":
				return <Key className="size-4" />;
			case "limit_reached":
				return <AlertCircle className="size-4" />;
			default:
				return <Clock className="size-4" />;
		}
	};

	const getStatusColor = (status: ActivityItem["status"]) => {
		switch (status) {
			case "success":
				return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400";
			case "pending":
				return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
			case "error":
				return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
			default:
				return "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-400";
		}
	};

	if (isLoading) {
		return (
			<div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
				<div className="space-y-4">
					<CardSkeleton />
					<CardSkeleton />
					<CardSkeleton />
				</div>
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
					onClick={fetchActivities}
				>
					Retry
				</Button>
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
			<div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
				<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
					Recent Activity
				</h2>
				<p className="text-sm text-zinc-500 dark:text-zinc-400">
					Latest events and transactions
				</p>
			</div>
			<div className="divide-y divide-zinc-200 dark:divide-zinc-800">
				{activities.length === 0 ? (
					<div className="p-6">
						<EmptyState
							icon={
								<Clock className="h-10 w-10 text-zinc-400 dark:text-zinc-500" />
							}
							title="No recent activity"
							description="Wallet, transaction, API key, and spending-limit events will appear here."
						/>
					</div>
				) : (
					activities.map((activity) => (
						<div
							key={activity.id}
							className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
						>
							<div className="flex items-start gap-4">
								<div
									className={`p-2 rounded-lg ${getStatusColor(
										activity.status,
									)}`}
								>
									{getActivityIcon(activity.type)}
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
										{activity.description}
									</p>
									<p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
										{formatTimeAgo(activity.timestamp)}
									</p>
								</div>
								{activity.network && (
									<Badge variant="outline" className="capitalize">
										{activity.network}
									</Badge>
								)}
								{activity.status === "pending" && (
									<span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
										Pending
									</span>
								)}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
