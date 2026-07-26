import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The possible states of the invisible wallet recovery system.
 *
 * - `active`       — Recovery system is running normally.
 * - `monitoring`   — System is watching for potential issues (animated pulse).
 * - `ready`        — System is ready to handle a recovery request.
 * - `error`        — An error occurred in the recovery system.
 * - `disconnected` — The recovery system cannot be reached.
 * - `unknown`      — Status could not be determined (safe fallback for any
 *                    value not in this union).
 */
export type RecoveryStatusValue =
	| "active"
	| "monitoring"
	| "ready"
	| "error"
	| "disconnected"
	| "unknown";

/**
 * Props for the {@link RecoveryStatus} badge component.
 */
export interface RecoveryStatusProps {
	/**
	 * The current recovery system status to display.
	 *
	 * Any unrecognised value is silently normalised to `"unknown"` so the badge
	 * always renders without throwing.
	 *
	 * @default "active"
	 */
	status?: RecoveryStatusValue;

	/**
	 * Additional Tailwind classes merged onto the root `<Badge>` element.
	 * Useful for overriding margin or width from a parent layout.
	 */
	className?: string;
}

interface StatusStyle {
	dot: string;
	badge: string;
	label: string;
	ariaLabel: string;
}

const STATUS_STYLES: Record<RecoveryStatusValue, StatusStyle> = {
	active: {
		dot: "bg-green-500",
		badge:
			"bg-green-50 text-green-700 border-green-200 hover:bg-green-50 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
		label: "Active",
		ariaLabel: "Recovery status: active",
	},
	monitoring: {
		dot: "bg-yellow-500 animate-pulse",
		badge:
			"bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
		label: "Monitoring",
		ariaLabel: "Recovery status: monitoring",
	},
	ready: {
		dot: "bg-blue-500",
		badge:
			"bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
		label: "Ready",
		ariaLabel: "Recovery status: ready",
	},
	error: {
		dot: "bg-red-500",
		badge:
			"bg-red-50 text-red-700 border-red-200 hover:bg-red-50 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
		label: "Error",
		ariaLabel: "Recovery status: error",
	},
	disconnected: {
		dot: "bg-zinc-400",
		badge:
			"bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800/40 dark:text-zinc-400 dark:border-zinc-700",
		label: "Disconnected",
		ariaLabel: "Recovery status: disconnected",
	},
	unknown: {
		dot: "bg-zinc-300 dark:bg-zinc-600",
		badge:
			"bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800/40 dark:text-zinc-500 dark:border-zinc-700",
		label: "Unknown",
		ariaLabel: "Recovery status: unknown",
	},
};

/**
 * Resolves an unrecognised status value to "unknown" so the badge
 * always renders gracefully instead of crashing.
 */
function resolveStatus(status: string): RecoveryStatusValue {
	return status in STATUS_STYLES ? (status as RecoveryStatusValue) : "unknown";
}

/**
 * Status badge for the invisible wallet recovery system.
 *
 * Renders a coloured dot and a human-readable label inside a `<Badge>`.
 * Each status variant has a distinct colour scheme so users can quickly
 * identify the system's health at a glance.
 *
 * @example
 * // Default (active) badge
 * <RecoveryStatus />
 *
 * @example
 * // Explicitly set status
 * <RecoveryStatus status="monitoring" />
 *
 * @example
 * // Unknown/invalid values fall back gracefully
 * <RecoveryStatus status={"stale" as RecoveryStatusValue} />
 */
export function RecoveryStatus({
	status = "active",
	className,
}: RecoveryStatusProps) {
	const resolved = resolveStatus(status);
	const { dot, badge, label, ariaLabel } = STATUS_STYLES[resolved];

	return (
		<Badge
			variant="outline"
			aria-label={ariaLabel}
			className={cn(badge, className)}
		>
			<span
				className={cn("h-2 w-2 rounded-full shrink-0", dot)}
				aria-hidden="true"
			/>
			{label}
		</Badge>
	);
}
