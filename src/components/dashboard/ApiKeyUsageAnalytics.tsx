"use client";

import { Activity, BarChart3, Clock } from "lucide-react";
import { ErrorState } from "@/components/ui/ErrorState";
import { useApiKeyUsage } from "@/hooks/useApiKeyUsage";

interface ApiKeyUsageAnalyticsProps {
	apiKeyId: string;
	apiKeyName?: string;
}

function formatLastUsed(lastUsedAt: string | null): string {
	if (!lastUsedAt) return "Never used";
	return new Date(lastUsedAt).toLocaleString();
}

/**
 * Per-key usage analytics (roadmap item: "Per-key usage analytics").
 * Reads from `useApiKeyUsage`, which proxies to the real mux-backend when
 * configured and only falls back to mock data outside production builds.
 */
export function ApiKeyUsageAnalytics({
	apiKeyId,
	apiKeyName,
}: ApiKeyUsageAnalyticsProps) {
	const { data, loading, error, refetch } = useApiKeyUsage(apiKeyId);

	if (loading) {
		return (
			<div
				className="space-y-3 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
				role="status"
				aria-label="Loading API key usage"
			>
				{[0, 1, 2].map((row) => (
					<div
						key={row}
						className="h-8 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900"
					/>
				))}
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
				<ErrorState
					title="Unable to load usage analytics"
					description={error?.message ?? "No usage data returned."}
					retry={{ label: "Retry", onRetry: refetch }}
				/>
			</div>
		);
	}

	const maxRequests = Math.max(1, ...data.dailyRequests.map((p) => p.requests));

	return (
		<div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
			<div className="mb-6 flex items-center gap-3">
				<div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-900">
					<BarChart3 className="size-5 text-zinc-600 dark:text-zinc-400" />
				</div>
				<div>
					<h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
						Usage analytics{apiKeyName ? ` — ${apiKeyName}` : ""}
					</h3>
					<p className="text-sm text-zinc-500 dark:text-zinc-400">
						Requests made with this API key over the last 14 days
					</p>
				</div>
			</div>

			<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
					<div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
						<Activity className="size-3.5" />
						Total requests (14d)
					</div>
					<p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
						{data.totalRequests.toLocaleString()}
					</p>
				</div>
				<div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
					<div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
						<Activity className="size-3.5" />
						Requests (24h)
					</div>
					<p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
						{data.requestsLast24h.toLocaleString()}
					</p>
				</div>
				<div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
					<div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
						<Clock className="size-3.5" />
						Last used
					</div>
					<p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
						{formatLastUsed(data.lastUsedAt)}
					</p>
				</div>
			</div>

			<div
				className="flex h-32 items-end gap-1"
				role="img"
				aria-label="Daily request volume for the last 14 days"
			>
				{data.dailyRequests.map((point) => (
					<div
						key={point.date}
						className="group relative flex-1 rounded-t bg-zinc-900 dark:bg-zinc-100"
						style={{
							height: `${Math.max(4, (point.requests / maxRequests) * 100)}%`,
						}}
						title={`${point.date}: ${point.requests} requests`}
					/>
				))}
			</div>
		</div>
	);
}
