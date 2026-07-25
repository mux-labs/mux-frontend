"use client";

import { HelpCircle, X } from "lucide-react";
import { useState } from "react";

/**
 * AnalyticsHelpPanel — #454 Document analytics data sources in UI help
 *
 * An inline dismissible help panel that surfaces key information about where
 * each analytics metric comes from and what it represents. Designed to be
 * shown at the top of the Analytics page so developers understand the data
 * sources without having to leave the dashboard.
 *
 * The panel is closeable and does not reappear after dismissal within the
 * same session (sessionStorage key `analytics-help-dismissed`).
 */
export function AnalyticsHelpPanel() {
	const [dismissed, setDismissed] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		return sessionStorage.getItem("analytics-help-dismissed") === "true";
	});

	function handleDismiss() {
		sessionStorage.setItem("analytics-help-dismissed", "true");
		setDismissed(true);
	}

	if (dismissed) return null;

	return (
		<aside
			aria-label="Analytics data sources help"
			className="rounded-xl border border-blue-200 bg-blue-50 p-4 sm:p-6 dark:border-blue-800 dark:bg-blue-900/10"
		>
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-start gap-3">
					<HelpCircle
						className="mt-0.5 h-5 w-5 shrink-0 text-blue-500 dark:text-blue-400"
						aria-hidden="true"
					/>
					<div>
						<h2 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
							About these analytics
						</h2>
						<p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
							All metrics are sourced from the Mux backend API and reflect
							activity for the currently selected network (Testnet / Mainnet).
							When no live API URL is configured the dashboard falls back to
							deterministic mock data so it remains functional in development and
							CI.
						</p>

						<dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
							<DataSourceItem
								label="Metrics cards"
								source="GET /api/analytics/metrics"
								description="Aggregated totals (volume, wallet count, transaction count, active wallets) for the selected date range."
							/>
							<DataSourceItem
								label="Volume chart"
								source="GET /api/analytics/volume"
								description="Daily XLM transaction volume in USD-equivalent, grouped by day."
							/>
							<DataSourceItem
								label="Transactions chart"
								source="GET /api/analytics/transactions"
								description="Daily transaction count, including Stellar operations initiated by the SDK."
							/>
							<DataSourceItem
								label="Top assets table"
								source="GET /api/analytics/assets"
								description="Assets ranked by transaction count and volume over the selected period."
							/>
						</dl>

						<p className="mt-4 text-xs text-blue-700 dark:text-blue-400">
							Data updates every 5 minutes. Use the{" "}
							<strong>Refresh</strong> button in the header to pull the latest
							snapshot immediately.{" "}
							<a
								href="/docs/analytics"
								className="underline underline-offset-2 hover:text-blue-900 dark:hover:text-blue-200"
								target="_blank"
								rel="noopener noreferrer"
							>
								Full API reference →
							</a>
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={handleDismiss}
					className="shrink-0 rounded p-1 text-blue-500 transition-colors hover:bg-blue-100 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-800 dark:hover:text-blue-200"
					aria-label="Dismiss analytics help"
				>
					<X className="h-4 w-4" aria-hidden="true" />
				</button>
			</div>
		</aside>
	);
}

// ─── Helper sub-component ──────────────────────────────────────────────────────

interface DataSourceItemProps {
	label: string;
	source: string;
	description: string;
}

function DataSourceItem({ label, source, description }: DataSourceItemProps) {
	return (
		<div>
			<dt className="font-medium text-blue-900 dark:text-blue-100">{label}</dt>
			<dd className="mt-0.5 text-blue-800 dark:text-blue-300">
				<code className="rounded bg-blue-100 px-1 py-0.5 text-xs font-mono dark:bg-blue-900/40">
					{source}
				</code>
				<span className="ml-1">{description}</span>
			</dd>
		</div>
	);
}
