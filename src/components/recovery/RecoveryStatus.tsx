import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RecoveryStatus = "active" | "monitoring" | "ready";

interface RecoveryStatusProps {
	status?: RecoveryStatus;
	className?: string;
}

const statusStyles: Record<RecoveryStatus, { dot: string; badge: string }> = {
	active: {
		dot: "bg-green-500",
		badge:
			"bg-green-50 text-green-700 border-green-200 hover:bg-green-50 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
	},
	monitoring: {
		dot: "bg-yellow-500 animate-pulse",
		badge:
			"bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
	},
	ready: {
		dot: "bg-blue-500",
		badge:
			"bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
	},
};

const statusLabels: Record<RecoveryStatus, string> = {
	active: "Active",
	monitoring: "Monitoring",
	ready: "Ready",
};

export function RecoveryStatus({
	status = "active",
	className,
}: RecoveryStatusProps) {
	const styles = statusStyles[status];

	return (
		<Badge variant="outline" className={cn(styles.badge, className)}>
			<span className={cn("h-2 w-2 rounded-full", styles.dot)} />
			{statusLabels[status]}
		</Badge>
	);
}
