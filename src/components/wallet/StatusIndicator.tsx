import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WalletStatus } from "@/types/wallet";

interface StatusIndicatorProps {
	status: WalletStatus;
	className?: string;
}

const statusStyles: Record<WalletStatus, { dot: string; badge: string }> = {
	active: {
		dot: "bg-green-500",
		badge:
			"bg-green-50 text-green-700 border-green-200 hover:bg-green-50 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
	},
	pending: {
		dot: "bg-yellow-500 animate-pulse",
		badge:
			"bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
	},
	inactive: {
		dot: "bg-zinc-400 dark:bg-zinc-500",
		badge:
			"bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
	},
};

const statusLabels: Record<WalletStatus, string> = {
	active: "Active",
	pending: "Pending",
	inactive: "Inactive",
};

export function StatusIndicator({ status, className }: StatusIndicatorProps) {
	const styles = statusStyles[status];

	return (
		<Badge variant="outline" className={cn(styles.badge, className)}>
			<span className={cn("h-2 w-2 rounded-full", styles.dot)} />
			{statusLabels[status]}
		</Badge>
	);
}
