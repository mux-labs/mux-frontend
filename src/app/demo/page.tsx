"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function DemoPage() {
	const [loading, setLoading] = useState(true);

	return (
		<div className="min-h-screen bg-zinc-50 p-8 dark:bg-black">
			<div className="mx-auto max-w-6xl space-y-12">
				<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
							Component UI Demo
						</h1>
						<p className="text-zinc-600 dark:text-zinc-400">
							Reusable components for empty, error, and loading states.
						</p>
					</div>
					<button
						onClick={() => setLoading(!loading)}
						className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
					>
						Toggle Loading State
					</button>
				</header>

				<section className="space-y-6">
					<h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
						1. Skeletons
					</h2>
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{loading ? (
							<>
								<CardSkeleton />
								<CardSkeleton />
								<CardSkeleton />
							</>
						) : (
							<div className="col-span-full py-20 text-center text-zinc-500">
								Data loaded! Toggle again to see skeletons.
							</div>
						)}
					</div>
				</section>

				<section className="grid gap-8 lg:grid-cols-2">
					<div className="space-y-6">
						<h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
							2. Empty State
						</h2>
						<EmptyState
							title="No events found"
							description="You haven't created any events yet. Start by creating your first event to see it here."
							action={{
								label: "Create Event",
								onClick: () => alert("Create Event Clicked"),
							}}
						/>
					</div>

					<div className="space-y-6">
						<h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
							3. Error State
						</h2>
						<ErrorState
							description="We couldn't fetch your dashboard data right now. Please check your internet connection and try again."
							retry={{
								onRetry: () => alert("Retrying..."),
							}}
						/>
					</div>
				</section>

				<section className="space-y-6">
					<h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
						4. Individual Skeletons
					</h2>
					<div className="max-w-md space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
						<div className="flex items-center gap-4">
							<Skeleton className="h-12 w-12 rounded-full" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-4 w-[200px]" />
								<Skeleton className="h-3 w-[150px]" />
							</div>
						</div>
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-3/4" />
					</div>
				</section>
			</div>
		</div>
	);
}
