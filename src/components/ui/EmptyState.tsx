import { ReactNode } from "react";

interface EmptyStateProps {
	icon?: ReactNode;
	title: string;
	description: string;
	action?: {
		label: string;
		onClick: () => void;
	};
}

export function EmptyState({
	icon,
	title,
	description,
	action,
}: EmptyStateProps) {
	return (
		<div className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
			<div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
				{icon || (
					<svg
						className="h-10 w-10 text-zinc-400 dark:text-zinc-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={1.5}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25-2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
						/>
					</svg>
				)}
			</div>
			<h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
				{title}
			</h3>
			<p className="mb-6 max-w-sm text-zinc-500 dark:text-zinc-400">
				{description}
			</p>
			{action && (
				<button
					onClick={action.onClick}
					className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-6 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
				>
					{action.label}
				</button>
			)}
		</div>
	);
}
