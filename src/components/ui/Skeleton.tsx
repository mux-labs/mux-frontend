import { HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
	return (
		<div
			data-testid="skeleton"
			className={`animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800 ${className}`}
			{...props}
		/>
	);
}

export function WalletTableSkeleton() {
	return (
		<div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
			{/* Table Header Skeleton */}
			<div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
				<Skeleton className="h-5 w-24" />
				<Skeleton className="h-9 w-28 rounded-full" />
			</div>

			{/* Table Content Skeleton */}
			<div className="divide-y divide-zinc-100 dark:divide-zinc-800">
				{/* Table Column Headers */}
				<div className="grid grid-cols-6 gap-4 px-6 py-3 bg-zinc-50 dark:bg-zinc-900/50">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-14" />
					<Skeleton className="hidden h-4 w-16 sm:block" />
					<Skeleton className="hidden h-4 w-16 md:block" />
					<Skeleton className="hidden h-4 w-24 lg:block" />
				</div>

				{/* Table Rows */}
				{Array.from({ length: 5 }).map((_, i) => (
					<div key={i} className="grid grid-cols-6 gap-4 px-6 py-4">
						{/* Address column */}
						<div className="flex items-center gap-2">
							<Skeleton className="h-8 w-32 rounded" />
							<Skeleton className="h-6 w-6 rounded" />
							<Skeleton className="h-6 w-6 rounded" />
						</div>
						{/* Network column */}
						<Skeleton className="h-6 w-20 rounded-full" />
						{/* Status column */}
						<Skeleton className="h-6 w-16 rounded-full" />
						{/* Balance column */}
						<Skeleton className="hidden h-4 w-24 sm:block" />
						{/* Created column */}
						<Skeleton className="hidden h-4 w-20 md:block" />
						{/* Last Activity column */}
						<Skeleton className="hidden h-4 w-20 lg:block" />
					</div>
				))}
			</div>
		</div>
	);
}

export function WalletDetailSkeleton() {
	return (
		<div
			className="space-y-6"
			role="status"
			aria-label="Loading wallet details"
			aria-busy="true"
			aria-live="polite"
		>
			{/* Balance card skeleton */}
			<div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
				<div className="mb-4 flex items-center justify-between">
					<Skeleton className="h-4 w-24" />
					<div className="flex items-center gap-2">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-8 w-8 rounded-md" />
					</div>
				</div>
				<Skeleton className="h-12 w-48" />
			</div>

			{/* Wallet info card skeleton */}
			<div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
				<Skeleton className="mb-4 h-4 w-24" />
				<div className="space-y-4">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="flex items-center justify-between">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-6 w-32" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export function CardSkeleton() {
	return (
		<div className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
			<Skeleton className="h-48 w-full rounded-lg" />
			<div className="space-y-2">
				<Skeleton className="h-6 w-3/4" />
				<Skeleton className="h-4 w-1/2" />
			</div>
			<div className="flex gap-2">
				<Skeleton className="h-8 w-20 rounded-full" />
				<Skeleton className="h-8 w-20 rounded-full" />
			</div>
		</div>
	);
}

/**
 * Skeleton placeholder for the RecoveryStatus badge.
 * Mirrors the shape of the active badge — a pill with a dot and label text.
 */
export function RecoveryStatusSkeleton({ className }: { className?: string }) {
	return (
		<div
			aria-label="Loading recovery status"
			aria-busy="true"
			className={className}
		>
			<Skeleton className="inline-flex items-center gap-1.5 h-6 w-24 rounded-full" />
		</div>
	);
}

/**
 * Skeleton placeholder for the RecoveryTimelineList.
 * Mirrors the layout: progress header, progress bar, event list, stat cards.
 */
export function RecoveryTimelineSkeleton({
	className,
	eventCount = 3,
}: { className?: string; eventCount?: number }) {
	return (
		<div
			className="space-y-6"
			role="status"
			aria-label="Loading recovery timeline"
			aria-busy="true"
			aria-live="polite"
		>
			{/* Progress header */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<Skeleton className="h-4 w-36" />
					<Skeleton className="h-4 w-24" />
				</div>
				<Skeleton className="h-2 w-full rounded-full" />
			</div>

			{/* Timeline events */}
			<div className="space-y-0">
				{Array.from({ length: eventCount }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
					<div key={i} className="flex gap-4 py-2">
						<div className="flex flex-col items-center">
							<Skeleton className="h-9 w-9 rounded-full shrink-0" />
							{i < eventCount - 1 && (
								<Skeleton className="w-1 flex-1 my-2 rounded-full" />
							)}
						</div>
						<div className="flex-1 space-y-2 pb-4">
							<div className="flex items-start justify-between gap-2">
								<div className="flex-1 space-y-1">
									<Skeleton className="h-4 w-40" />
									<Skeleton className="h-3 w-full max-w-md" />
								</div>
								<Skeleton className="h-3 w-12 shrink-0" />
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Stat summary cards */}
			<div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
				{Array.from({ length: 3 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
					<div key={i} className="text-center space-y-2">
						<Skeleton className="h-8 w-12 mx-auto" />
						<Skeleton className="h-3 w-16 mx-auto" />
					</div>
				))}
			</div>
		</div>
	);
}
