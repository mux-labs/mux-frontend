"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/** Visual variant for the standalone `Toast` component. */
export type ToastVariant = "success" | "error" | "info";

export interface ToastProps {
	open: boolean;
	/** The message body displayed inside the toast. */
	message: string;
	/** Visual variant controlling icon and colour scheme. Defaults to "success". */
	variant?: ToastVariant;
}

const VARIANT_STYLES: Record<
	ToastVariant,
	{ container: string; title: string }
> = {
	success: {
		container: "bg-zinc-950/95",
		title: "Success",
	},
	error: {
		container: "bg-red-950/95",
		title: "Error",
	},
	info: {
		container: "bg-blue-950/95",
		title: "Info",
	},
};

export function Toast({ open, message, variant = "success" }: ToastProps) {
	if (!open) {
		return null;
	}

	const { icon: Icon, iconClass, defaultTitle } = VARIANT_CONFIG[variant];
	const displayTitle = title ?? defaultTitle;

	return (
		<div className="fixed right-4 bottom-4 z-50 max-w-xs rounded-2xl bg-zinc-950/95 p-4 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md">
			<div role="status" aria-live="polite" className="flex items-start gap-3">
				<Icon
					className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`}
					aria-hidden="true"
				/>
				<div className="flex-1 space-y-1">
					<p className="text-sm font-semibold">{displayTitle}</p>
					<p className="text-sm text-zinc-200">{message}</p>
				</div>
				{onClose && (
					<button
						onClick={onClose}
						className="-mr-1 -mt-1 ml-auto rounded p-1 text-zinc-400 transition-colors hover:text-zinc-200"
						aria-label="Dismiss notification"
					>
						<X className="h-3.5 w-3.5" aria-hidden="true" />
					</button>
				)}
			</div>
		</div>
	);
}

// ─── Toast Container ─────────────────────────────────────────────────────────

export type ToastMessageType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
	id: string;
	type: ToastMessageType;
	message: string;
	description?: string;
	/** Auto-dismiss delay in ms. `0` disables auto-dismiss. Defaults to 5000. */
	duration?: number;
}

export type ToastPosition =
	| "top-right"
	| "top-left"
	| "bottom-right"
	| "bottom-left";

export interface ToastContainerProps {
	toasts: ToastMessage[];
	onDismiss: (id: string) => void;
	position?: ToastPosition;
}

const positionClasses: Record<ToastPosition, string> = {
	"top-right": "top-4 right-4",
	"top-left": "top-4 left-4",
	"bottom-right": "bottom-4 right-4",
	"bottom-left": "bottom-4 left-4",
};

const TOAST_ITEM_ICON: Record<
	ToastMessageType,
	{ icon: React.ElementType; iconClass: string }
> = {
	success: { icon: CheckCircle2, iconClass: "text-green-500" },
	error: { icon: AlertCircle, iconClass: "text-red-500" },
	info: { icon: Info, iconClass: "text-blue-500" },
	warning: { icon: AlertTriangle, iconClass: "text-amber-500" },
};

const DEFAULT_TOAST_DURATION = 5000;

interface ToastItemProps {
	toast: ToastMessage;
	onDismiss: (id: string) => void;
}

/** A single dismissible, optionally auto-expiring toast notification. */
export function ToastItem({ toast, onDismiss }: ToastItemProps) {
	const { id, type, message, description, duration } = toast;

	// biome-ignore lint/correctness/useExhaustiveDependencies: only re-arm the timer when the toast identity/duration changes
	useEffect(() => {
		const effectiveDuration = duration ?? DEFAULT_TOAST_DURATION;
		if (effectiveDuration === 0) return;

		const timer = window.setTimeout(() => {
			onDismiss(id);
		}, effectiveDuration);

		return () => window.clearTimeout(timer);
	}, [id, duration, onDismiss]);

	const { icon: Icon, iconClass } = TOAST_ITEM_ICON[type];

	return (
		<div
			role="alert"
			className="flex items-start gap-3 rounded-xl bg-white p-4 text-zinc-900 shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-zinc-800"
		>
			<Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} aria-hidden="true" />
			<div className="flex-1 space-y-1">
				<p className="text-sm font-semibold">{message}</p>
				{description && (
					<p className="text-sm text-zinc-500 dark:text-zinc-400">
						{description}
					</p>
				)}
			</div>
			<button
				type="button"
				onClick={() => onDismiss(id)}
				className="ml-2 shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
				aria-label={`Dismiss ${type} notification`}
			>
				<span aria-hidden="true">&times;</span>
			</button>
		</div>
	);
}

/**
 * Container that renders a stack of toast notifications.
 * Positions the toasts based on the `position` prop.
 * Returns null when there are no toasts to display (empty state).
 */
export function ToastContainer({
	toasts,
	onDismiss,
	position = "top-right",
}: ToastContainerProps) {
	if (toasts.length === 0) return null;

	return (
		<div
			className={cn(
				"fixed right-4 bottom-4 z-50 max-w-xs rounded-2xl p-4 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md",
				container,
			)}
		>
			<div role="status" aria-live="polite" className="space-y-1">
				<p className="text-sm font-semibold">{title}</p>
				<p className="text-sm text-zinc-200">{message}</p>
			</div>
		</div>
	);
}
