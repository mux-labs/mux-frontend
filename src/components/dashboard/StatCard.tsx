import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatCardVariant = "default" | "warning" | "danger" | "success";

interface StatCardProps {
	title: string;
	value: number | string;
	description?: string;
	icon: ReactNode;
	variant?: StatCardVariant;
	/** Optional trend label, e.g. "+12% from last week" */
	trend?: string;
}

const variantStyles: Record<
	StatCardVariant,
	{ card: string; icon: string; value: string }
> = {
	default: {
		card: "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
		icon: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
		value: "text-zinc-900 dark:text-zinc-50",
	},
	success: {
		card: "border-green-100 bg-green-50/50 dark:border-green-900/30 dark:bg-green-900/10",
		icon: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
		value: "text-green-900 dark:text-green-100",
	},
	warning: {
		card: "border-amber-100 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-900/10",
		icon: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
		value: "text-amber-900 dark:text-amber-100",
	},
	danger: {
		card: "border-red-100 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10",
		icon: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
		value: "text-red-900 dark:text-red-100",
	},
};

export function StatCard({
	title,
	value,
	description,
	icon,
	variant = "default",
	trend,
}: StatCardProps) {
	const styles = variantStyles[variant];

	return (
		<div
			className={cn(
				"rounded-xl border p-6 shadow-sm transition-shadow hover:shadow-md",
				styles.card,
			)}
		>
			<div className="flex items-start justify-between gap-4">
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 truncate">
						{title}
					</p>
					<p className={cn("mt-1 text-3xl font-bold tabular-nums", styles.value)}>
						{value}
					</p>
					{description && (
						<p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
							{description}
						</p>
					)}
					{trend && (
						<p className="mt-2 text-xs font-medium text-zinc-400 dark:text-zinc-500">
							{trend}
						</p>
					)}
				</div>
				<div
					className={cn(
						"flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
						styles.icon,
					)}
					aria-hidden="true"
				>
					{icon}
				</div>
			</div>
		</div>
	);
}
