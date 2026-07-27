"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import React from "react";

const REQUESTS_TODAY_ENDPOINT = "/api/requests/today";

function formatRequestCount(count: number): string {
	return new Intl.NumberFormat("en-US").format(count);
}

export default function RequestsToday() {
	const [count, setCount] = React.useState<number | null>(null);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);

	const loadRequestsToday = React.useCallback(() => {
		let mounted = true;
		setLoading(true);
		setError(null);
		fetch(REQUESTS_TODAY_ENDPOINT)
			.then((res) => {
				if (!res.ok) throw new Error(`Request failed: ${res.status}`);
				return res.json();
			})
			.then((data) => {
				if (!mounted) return;
				if (typeof data?.count === "number" && data.count >= 0) {
					setCount(data.count);
				} else {
					setCount(null);
					setError("The requests total was not available.");
				}
			})
			.catch((err) => {
				if (!mounted) return;
				setCount(null);
				setError(err?.message || "Unable to load requests today.");
			})
			.finally(() => {
				if (!mounted) return;
				setLoading(false);
			});
		return () => {
			mounted = false;
		};
	}, []);

	React.useEffect(() => {
		return loadRequestsToday();
	}, [loadRequestsToday]);

	return (
		<section
			aria-labelledby="requests-today-title"
			className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
		>
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2
						id="requests-today-title"
						className="text-sm font-medium text-zinc-500 dark:text-zinc-400"
					>
						API requests today
					</h2>
					<p className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
						{loading ? (
							<span
								aria-label="Loading API requests today"
								className="inline-block h-9 w-28 animate-pulse rounded bg-zinc-200 align-middle dark:bg-zinc-800"
							/>
						) : error ? (
							<span aria-label="Requests today unavailable">—</span>
						) : count === null ? (
							<span aria-label="No requests today">0</span>
						) : (
							formatRequestCount(count)
						)}
					</p>
				</div>

				<button
					type="button"
					onClick={loadRequestsToday}
					disabled={loading}
					className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50 dark:focus-visible:ring-offset-zinc-950"
					aria-label="Refresh API requests today"
				>
					<RefreshCw
						className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
						aria-hidden="true"
					/>
				</button>
			</div>

			{loading ? (
				<p role="status" className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
					Loading API requests today…
				</p>
			) : error ? (
				<div
					role="alert"
					className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
				>
					<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
					<div>
						<p className="font-medium">Requests could not be loaded.</p>
						<p className="mt-0.5">{error}</p>
					</div>
				</div>
			) : count === 0 || count === null ? (
				<p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
					No API requests have been recorded today.
				</p>
			) : (
				<p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
					Counted from the active API environment for the current day.
				</p>
			)}
		</section>
	);
}
