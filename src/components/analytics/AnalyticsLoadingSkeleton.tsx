import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Skeleton placeholder for the MetricsCards grid (4 stat cards).
 */
export function MetricsCardsSkeleton() {
	return (
		<div
			className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
			aria-label="Loading metrics"
			aria-busy="true"
		>
			{Array.from({ length: 4 }).map((_, i) => (
				<div
					key={i}
					className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
				>
					{/* label */}
					<Skeleton className="h-4 w-28" />
					{/* value */}
					<Skeleton className="mt-3 h-8 w-20" />
					{/* change badge */}
					<div className="mt-3 flex items-center gap-2">
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-3 w-20" />
					</div>
				</div>
			))}
		</div>
	);
}

/**
 * Skeleton placeholder for a single AnalyticsChart card.
 */
export function AnalyticsChartSkeleton() {
	return (
		<div
			className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
			aria-label="Loading chart"
			aria-busy="true"
		>
			{/* title + description */}
			<div className="mb-6 space-y-2">
				<Skeleton className="h-5 w-40" />
				<Skeleton className="h-4 w-64" />
			</div>

			{/* bar chart area */}
			<div className="flex items-end gap-1 sm:gap-2" style={{ height: 120 }}>
				{Array.from({ length: 7 }).map((_, i) => (
						<div key={i} className="flex flex-1 flex-col items-center gap-1.5">
						<Skeleton
							className="w-full max-w-[32px] rounded-t-md"
							style={{ height: `${40 + ((i * 17) % 60)}%` }}
						/>
						<Skeleton className="h-3 w-6" />
					</div>
				))}
			</div>

			{/* footer totals */}
			<div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
				<Skeleton className="h-4 w-28" />
				<Skeleton className="h-4 w-24" />
			</div>
		</div>
	);
}

/**
 * Skeleton placeholder for the TopAssetsTable.
 */
export function TopAssetsTableSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div
			className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
			aria-label="Loading top assets"
			aria-busy="true"
		>
			{/* header */}
			<div className="border-b border-zinc-200 px-4 py-4 sm:px-6 dark:border-zinc-800 space-y-2">
				<Skeleton className="h-5 w-44" />
				<Skeleton className="h-4 w-56" />
			</div>

			{/* table rows */}
			<div className="divide-y divide-zinc-100 dark:divide-zinc-800">
				{Array.from({ length: rows }).map((_, i) => (
						<div key={i} className="flex items-center gap-4 px-4 py-4 sm:px-6">
						{/* rank */}
						<Skeleton className="h-4 w-4 shrink-0" />
						{/* avatar + name */}
						<div className="flex items-center gap-3 flex-1 min-w-0">
							<Skeleton className="h-7 w-7 rounded-full shrink-0 sm:h-8 sm:w-8" />
							<div className="space-y-1 min-w-0">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-3 w-10" />
							</div>
						</div>
						{/* volume */}
						<Skeleton className="h-4 w-20 ml-auto" />
						{/* change — hidden on xs */}
						<Skeleton className="hidden h-4 w-12 sm:block" />
						{/* tvl — hidden below md */}
						<Skeleton className="hidden h-4 w-16 md:block" />
						{/* tx count — hidden below md */}
						<Skeleton className="hidden h-4 w-14 md:block" />
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * Full-page analytics loading skeleton.
 * Mirrors the layout of the analytics page: header, metrics, two charts, assets table.
 */
export function AnalyticsLoadingSkeleton() {
	return (
		<div
			className="space-y-6"
			role="status"
			aria-label="Loading analytics data"
			aria-live="polite"
		>
			{/* Page header skeleton */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-2">
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-4 w-72" />
				</div>
				{/* Range picker skeleton */}
				<Skeleton className="h-10 w-48 rounded-lg" />
			</div>

			{/* Metrics cards */}
			<MetricsCardsSkeleton />

			{/* Two chart cards side-by-side on larger screens */}
			<div className="grid gap-6 lg:grid-cols-2">
				<AnalyticsChartSkeleton />
				<AnalyticsChartSkeleton />
			</div>

			{/* Top assets table */}
			<TopAssetsTableSkeleton />
		</div>
	);
}
