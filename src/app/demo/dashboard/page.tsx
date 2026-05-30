import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Wallet,
	Webhook,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { dummyWallets } from "@/mock-data/wallets";
import { webhookStats } from "@/mock-data/webhooks";

/**
 * Derives wallet summary counts from the mock data.
 * Replace with a real data-fetch (e.g. apiClient.get) when the backend is ready.
 */
function getWalletStats() {
	return {
		total: dummyWallets.length,
		active: dummyWallets.filter((w) => w.status === "active").length,
		pending: dummyWallets.filter((w) => w.status === "pending").length,
		inactive: dummyWallets.filter((w) => w.status === "inactive").length,
	};
}

export default function DashboardHome() {
	const walletStats = getWalletStats();

	return (
		<div className="space-y-8">
			{/* Page header */}
			<div>
				<h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
					Overview
				</h1>
				<p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
					A snapshot of your wallets and webhook activity.
				</p>
			</div>

			{/* Wallet stats */}
			<section aria-labelledby="wallets-heading">
				<h2
					id="wallets-heading"
					className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500"
				>
					Wallets
				</h2>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<StatCard
						title="Total Wallets"
						value={walletStats.total}
						description="All wallets across networks"
						icon={<Wallet className="h-6 w-6" />}
						variant="default"
					/>
					<StatCard
						title="Active Wallets"
						value={walletStats.active}
						description="Currently active"
						icon={<CheckCircle2 className="h-6 w-6" />}
						variant="success"
					/>
					<StatCard
						title="Pending Wallets"
						value={walletStats.pending}
						description="Awaiting activation"
						icon={<Clock className="h-6 w-6" />}
						variant="warning"
					/>
					<StatCard
						title="Inactive Wallets"
						value={walletStats.inactive}
						description="No recent activity"
						icon={<Wallet className="h-6 w-6" />}
						variant="default"
					/>
				</div>
			</section>

			{/* Webhook stats */}
			<section aria-labelledby="webhooks-heading">
				<h2
					id="webhooks-heading"
					className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500"
				>
					Webhooks
				</h2>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<StatCard
						title="Total Webhooks"
						value={webhookStats.total}
						description="All webhook events"
						icon={<Webhook className="h-6 w-6" />}
						variant="default"
					/>
					<StatCard
						title="Failed Webhooks"
						value={webhookStats.failed}
						description="Delivery failures requiring attention"
						icon={<AlertTriangle className="h-6 w-6" />}
						variant={webhookStats.failed > 0 ? "danger" : "success"}
					/>
					<StatCard
						title="Delivered Webhooks"
						value={webhookStats.delivered}
						description="Successfully delivered"
						icon={<CheckCircle2 className="h-6 w-6" />}
						variant="success"
					/>
				</div>
			</section>
		</div>
	);
}
