import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Props for the {@link RecoveryLoadingState} skeleton component.
 */
interface RecoveryLoadingStateProps {
	/**
	 * Accessible label announced by screen readers while the skeleton is
	 * visible. Also rendered as a visually-hidden `<span>` below the skeleton.
	 *
	 * @default "Loading recovery status…"
	 */
	message?: string;

	/**
	 * Additional Tailwind classes merged onto the root wrapper element.
	 */
	className?: string;
}

/**
 * Full-section skeleton loader for the recovery UI.
 *
 * Shown while the initial recovery status is being fetched from the backend.
 * The skeleton mirrors the visual structure of {@link RecoveryExplanation} so
 * the page layout does not shift when real content replaces the placeholder.
 *
 * Accessibility: the root element carries `role="status"`, `aria-live="polite"`
 * and `aria-busy="true"` so assistive technologies announce the loading state
 * without interrupting the user.
 *
 * @example
 * {recovery.state === "loading" && <RecoveryLoadingState />}
 *
 * @example
 * // Custom accessible message
 * <RecoveryLoadingState message="Fetching wallet status…" />
 */
export function RecoveryLoadingState({
	message = "Loading recovery status\u2026",
	className,
}: RecoveryLoadingStateProps) {
	return (
		<div
			role="status"
			aria-label={message}
			aria-live="polite"
			aria-busy="true"
			className={cn("space-y-8", className)}
		>
			{/* Status card skeleton */}
			<div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Skeleton className="h-9 w-9 rounded-full" />
						<div className="space-y-2">
							<Skeleton className="h-4 w-40" />
							<Skeleton className="h-3 w-56" />
						</div>
					</div>
					<Skeleton className="h-6 w-20 rounded-full" />
				</div>
			</div>

			{/* Explanation card skeleton */}
			<div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-6">
				<div className="space-y-2">
					<Skeleton className="h-6 w-64" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-5/6" />
				</div>

				<div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 space-y-4">
					<Skeleton className="h-5 w-32" />
					{[1, 2, 3].map((i) => (
						<div key={i} className="flex gap-4">
							<Skeleton className="h-8 w-8 rounded-full shrink-0" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-4 w-40" />
								<Skeleton className="h-3 w-full" />
								<Skeleton className="h-3 w-4/5" />
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Visually hidden accessible label */}
			<span className="sr-only">{message}</span>
		</div>
	);
}
