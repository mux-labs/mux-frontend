"use client";

import { useState } from "react";
import type { Metric } from "@/mock-data/analytics";
import { CopyButton } from "./CopyButton";
import { Toast } from "@/components/ui/toast";

interface MetricsCardsProps {
	metrics: Metric[];
}

function ArrowIcon({ direction }: { direction: "up" | "down" }) {
	return (
		<svg
			className={`h-4 w-4 ${
				direction === "up" ? "text-emerald-500" : "text-red-500"
			}`}
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			strokeWidth={2}
		>
			{direction === "up" ? (
				<path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
			) : (
				<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
			)}
		</svg>
	);
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	const handleCopySuccess = (text: string, label: string) => {
		setToastMessage(`Copied ${label}: ${text}`);
		setTimeout(() => setToastMessage(null), 3000);
	};

	return (
		<>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{metrics.map((metric) => (
					<div
						key={metric.label}
						className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
					>
						<div className="flex items-start justify-between">
							<p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
								{metric.label}
							</p>
							<div className="opacity-0 transition-opacity group-hover:opacity-100">
								<CopyButton
									text={metric.value}
									label={`Copy ${metric.label} value`}
									onCopySuccess={(text) =>
										handleCopySuccess(text, metric.label)
									}
								/>
							</div>
						</div>
						<p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
							{metric.value}
						</p>
						<div className="mt-2 flex items-center gap-1.5">
							<div
								className={`flex items-center gap-0.5 text-sm font-medium ${
									metric.change >= 0
										? "text-emerald-600 dark:text-emerald-400"
										: "text-red-600 dark:text-red-400"
								}`}
							>
								<ArrowIcon direction={metric.change >= 0 ? "up" : "down"} />
								{Math.abs(metric.change)}%
							</div>
							<span className="text-xs text-zinc-400 dark:text-zinc-500">
								{metric.changeLabel}
							</span>
						</div>
					</div>
				))}
			</div>
			{toastMessage && (
				<Toast
					message={toastMessage}
					variant="success"
					onClose={() => setToastMessage(null)}
				/>
			)}
		</>
	);
}
