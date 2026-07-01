import { ReactNode } from "react";

interface ErrorStateProps {
	icon?: ReactNode;
	title?: string;
	description: string;
	retry?: {
		label?: string;
		onRetry: () => void;
	};
}

export function ErrorState({
	icon,
	title = "Something went wrong",
	description,
	retry,
}: ErrorStateProps) {
	return (
		<div className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50/50 p-8 text-center dark:border-red-900/30 dark:bg-red-900/10">
			<div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
				{icon || (
					<svg
						className="h-10 w-10 text-red-600 dark:text-red-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={1.5}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
						/>
					</svg>
				)}
			</div>
			<h3 className="mb-2 text-xl font-semibold text-red-900 dark:text-red-100">
				{title}
			</h3>
			<p className="mb-6 max-w-sm text-red-700 dark:text-red-400">
				{description}
			</p>
			{retry && (
				<button
					onClick={retry.onRetry}
					className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-6 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
				>
					{retry.label || "Try Again"}
				</button>
			)}
		</div>
	);
}
