import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardRouteLoading() {
	return (
		<div
			className="space-y-6"
			role="status"
			aria-busy="true"
			aria-live="polite"
			aria-label="Loading dashboard"
		>
			<span className="sr-only">Loading dashboard…</span>

			{/* Page header skeleton */}
			<div className="flex flex-col gap-2">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-4 w-72" />
			</div>

			{/* Primary content card skeleton */}
			<div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
				<Skeleton className="mb-4 h-5 w-32" />
				<div className="space-y-3">
					{Array.from({ length: 4 }, (_, i) => (
						<div key={i} className="flex items-center gap-4">
							<Skeleton className="h-4 flex-1" />
							<Skeleton className="h-4 w-16" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
