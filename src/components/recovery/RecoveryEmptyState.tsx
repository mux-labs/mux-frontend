/**
 * Empty state UI for the Recovery page.
 *
 * Shown when the wallet has no recovery history — i.e. a recovery has never
 * been initiated. Provides a shield icon, descriptive copy, and an optional
 * call-to-action button so users can kick off a recovery directly from the
 * empty state.
 */

interface RecoveryEmptyStateProps {
	/** Called when the user clicks "Initiate Recovery". Omit to hide the button. */
	onInitiate?: () => void;
	/** Extra Tailwind classes merged onto the root element. */
	className?: string;
}

export function RecoveryEmptyState({
	onInitiate,
	className,
}: RecoveryEmptyStateProps) {
	return (
		<div
			role="status"
			aria-label="No recovery history"
			className={[
				"flex min-h-[400px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50",
				className,
			]
				.filter(Boolean)
				.join(" ")}
		>
			<div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth={1.5}
					stroke="currentColor"
					className="h-10 w-10 text-zinc-400 dark:text-zinc-500"
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
					/>
				</svg>
			</div>

			<h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
				No recovery history
			</h3>

			<p className="mb-6 max-w-sm text-zinc-500 dark:text-zinc-400">
				Your wallet has not initiated any recovery requests. Once you start a
				recovery, it will appear here.
			</p>

			{onInitiate && (
				<button
					type="button"
					onClick={onInitiate}
					className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-6 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus-visible:ring-zinc-50"
				>
					Initiate Recovery
				</button>
			)}
		</div>
	);
}
