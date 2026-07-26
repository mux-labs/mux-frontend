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
