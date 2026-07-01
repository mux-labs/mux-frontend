import { SpendingLimitsCard } from "@/components/dashboard/SpendingLimitsCard";

export default function SpendingLimitsPage() {
	return (
		<main className="min-h-screen bg-zinc-50 dark:bg-black p-8">
			<div className="max-w-5xl mx-auto space-y-8">
				<div className="space-y-2">
					<h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
						Settings
					</h1>
					<p className="text-zinc-500 dark:text-zinc-400">
						Configure your API spending thresholds and monitor your daily
						consumption.
					</p>
				</div>

				<div className="grid gap-8">
					<SpendingLimitsCard />

					<div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
						<h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
							Billing & Overages
						</h3>
						<p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">
							Once you reach your daily spending limit, your API requests will
							return a 429 status code. You can increase your limits by
							contacting our support team or upgrading your plan.
						</p>
						<a
							href="#"
							className="text-sm font-medium text-zinc-900 dark:text-zinc-50 hover:underline inline-flex items-center gap-1"
						>
							View billing details
						</a>
					</div>
				</div>
			</div>
		</main>
	);
}
