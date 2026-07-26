import { SpendingLimitsCard } from "@/components/dashboard/SpendingLimitsCard";
import { PageHeader } from "@/components/ui/PageHeader";

export default function SpendingLimitsPage() {
	return (
		<div className="space-y-8">
			<PageHeader
				title="Spending Limits"
				description="Configure your API spending thresholds and monitor your daily consumption."
			/>

			<div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] xl:items-start">
				<SpendingLimitsCard />

				<div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
					<h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
						Billing & Overages
					</h3>
					<p className="mb-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
						Once you reach your daily spending limit, your API requests will
						return a 429 status code. You can increase your limits by contacting
						our support team or upgrading your plan.
					</p>
					<a
						href="#"
						className="inline-flex items-center gap-1 text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
					>
						View billing details
					</a>
				</div>
			</div>
		</div>
	);
}
