import { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
	return (
		<div
			className={`animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800 ${className}`}
			{...props}
		/>
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
