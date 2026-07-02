import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import { useEffect, useState, useCallback } from "react";

/** Props for the `Toast` notification component. */
export interface ToastProps {
	/** Whether the toast is visible. When `false` nothing is rendered. */
	open: boolean;
	/** The message body displayed inside the toast. */
	message: string;
	/**
	 * Visual style variant.
	 * Defaults to `"success"` when omitted.
	 */
	variant?: ToastVariant;
	/**
	 * Overrides the default title for the variant (`"Success"` / `"Error"` / `"Info"`).
	 */
	title?: string;
	/**
	 * When provided, renders a dismiss (✕) button that calls this handler.
	 * Omit to render a non-dismissible toast.
	 */
	onClose?: () => void;
}

const VARIANT_CONFIG: Record<
	ToastVariant,
	{ icon: React.ElementType; iconClass: string; defaultTitle: string }
> = {
	success: {
		icon: CheckCircle2,
		iconClass: "text-green-400",
		defaultTitle: "Success",
	},
	error: {
		icon: AlertCircle,
		iconClass: "text-red-400",
		defaultTitle: "Error",
	},
	info: {
		icon: Info,
		iconClass: "text-blue-400",
		defaultTitle: "Info",
	},
};

export function Toast({
	open,
	message,
	variant = "success",
	title,
	onClose,
}: ToastProps) {
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
