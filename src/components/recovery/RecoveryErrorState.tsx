/**
 * Error state UI for the Recovery page.
 *
 * Shown when recovery status cannot be loaded — typically because the initial
 * API call failed or the backend is unreachable. Presents a red error panel
 * with an optional retry button so users can attempt to reload without a full
 * page refresh.
 */

interface RecoveryErrorStateProps {
	/** Error description shown to the user. Falls back to a generic message. */
	description?: string;
	/** Called when the user clicks "Try Again". Omit to hide the retry button. */
	onRetry?: () => void;
	/** Extra Tailwind classes merged onto the root element. */
	className?: string;
}

export function RecoveryErrorState({
	description = "Unable to load recovery information. Please check your connection and try again.",
	onRetry,
	className,
}: RecoveryErrorStateProps) {
	return (
		<div
			role="alert"
			aria-label="Recovery status unavailable"
			className={[
				"flex min-h-[400px] w-full flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50/50 p-8 text-center dark:border-red-900/30 dark:bg-red-900/10",
				className,
			]
				.filter(Boolean)
				.join(" ")}
		>
			<div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth={1.5}
					stroke="currentColor"
					className="h-10 w-10 text-red-600 dark:text-red-500"
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
					/>
				</svg>
			</div>

			<h3 className="mb-2 text-xl font-semibold text-red-900 dark:text-red-100">
				Recovery status unavailable
			</h3>

			<p className="mb-6 max-w-sm text-red-700 dark:text-red-400">
				{description}
			</p>

			{onRetry && (
				<button
					type="button"
					onClick={onRetry}
					className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-6 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 dark:bg-red-500 dark:hover:bg-red-600"
				>
					Try Again
				</button>
			)}
		</div>
	);
}
