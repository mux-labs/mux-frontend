"use client";

import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	Info,
	X,
} from "lucide-react";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastVariant = "success" | "error" | "info" | "warning";

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
	warning: {
		icon: AlertTriangle,
		iconClass: "text-yellow-400",
		defaultTitle: "Warning",
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
		<div
			role="alert"
			aria-live="assertive"
			className={cn(
				"flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg dark:bg-zinc-900",
				variant === "success" && "border-green-200 dark:border-green-800",
				variant === "error" && "border-red-200 dark:border-red-800",
				variant === "info" && "border-blue-200 dark:border-blue-800",
				variant === "warning" && "border-yellow-200 dark:border-yellow-800",
			)}
		>
			<Icon
				className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`}
				aria-hidden="true"
			/>
			<div className="flex-1 space-y-1">
				<p className="text-sm font-semibold">{displayTitle}</p>
				<p className="text-sm text-zinc-600 dark:text-zinc-300">{message}</p>
			</div>
			{onClose && (
				<button
					type="button"
					onClick={onClose}
					aria-label="Dismiss notification"
					className="ml-auto rounded p-0.5 text-zinc-400 hover:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:hover:text-zinc-200"
				>
					<X className="h-4 w-4" aria-hidden="true" />
				</button>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// ToastMessage — data model for the queue-based toast system
// ---------------------------------------------------------------------------

export type ToastType = ToastVariant;

export interface ToastMessage {
	id: string;
	type: ToastType;
	message: string;
	description?: string;
	/** Duration in ms before auto-dismiss. 0 = no auto-dismiss. Default: 5000 */
	duration?: number;
}

// ---------------------------------------------------------------------------
// ToastItem — single notification
// ---------------------------------------------------------------------------

interface ToastItemProps {
	toast: ToastMessage;
	onDismiss: (id: string) => void;
}

const ICONS: Record<ToastType, React.ReactNode> = {
	success: (
		<svg
			className="h-5 w-5 text-green-500"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			strokeWidth={2}
			aria-hidden="true"
		>
			<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
		</svg>
	),
	error: (
		<svg
			className="h-5 w-5 text-red-500"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			strokeWidth={2}
			aria-hidden="true"
		>
			<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
		</svg>
	),
	info: (
		<svg
			className="h-5 w-5 text-blue-500"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			strokeWidth={2}
			aria-hidden="true"
		>
			<path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
		</svg>
	),
	warning: (
		<svg
			className="h-5 w-5 text-yellow-500"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			strokeWidth={2}
			aria-hidden="true"
		>
			<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
		</svg>
	),
};

const LABELS: Record<ToastType, string> = {
	success: "Success",
	error: "Error",
	info: "Info",
	warning: "Warning",
};

export function ToastItem({ toast, onDismiss }: ToastItemProps) {
	const { id, type, message, description, duration = 5000 } = toast;
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (duration === 0) return;
		timerRef.current = setTimeout(() => {
			onDismiss(id);
		}, duration);
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [id, duration, onDismiss]);

	return (
		<div
			role="alert"
			aria-live="assertive"
			className={cn(
				"flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg dark:bg-zinc-900",
				type === "success" && "border-green-200 dark:border-green-800",
				type === "error" && "border-red-200 dark:border-red-800",
				type === "info" && "border-blue-200 dark:border-blue-800",
				type === "warning" && "border-yellow-200 dark:border-yellow-800",
			)}
		>
			<span className="mt-0.5 shrink-0">{ICONS[type]}</span>
			<div className="flex-1 space-y-1">
				<p className="text-sm font-semibold">{LABELS[type]}</p>
				<p className="text-sm text-zinc-600 dark:text-zinc-300">{message}</p>
				{description && (
					<p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
						{description}
					</p>
				)}
			</div>
			<button
				type="button"
				onClick={() => onDismiss(id)}
				aria-label="Dismiss notification"
				className="ml-auto rounded p-0.5 text-zinc-400 hover:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:hover:text-zinc-200"
			>
				<X className="h-4 w-4" aria-hidden="true" />
			</button>
		</div>
	);
}

// ---------------------------------------------------------------------------
// ToastContainer — renders the queue of active toasts
// ---------------------------------------------------------------------------

export type ToastPosition =
	| "top-right"
	| "top-left"
	| "top-center"
	| "bottom-right"
	| "bottom-left"
	| "bottom-center";

interface ToastContainerProps {
	toasts: ToastMessage[];
	onDismiss: (id: string) => void;
	position?: ToastPosition;
}

const POSITION_CLASSES: Record<ToastPosition, string> = {
	"top-right": "top-4 right-4",
	"top-left": "top-4 left-4",
	"top-center": "top-4 left-1/2 -translate-x-1/2",
	"bottom-right": "bottom-4 right-4",
	"bottom-left": "bottom-4 left-4",
	"bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
};

export function ToastContainer({
	toasts,
	onDismiss,
	position = "top-right",
}: ToastContainerProps) {
	if (toasts.length === 0) return null;

	return (
		<div
			aria-label="Notifications"
			className={`fixed z-50 flex flex-col gap-2 w-full max-w-sm ${POSITION_CLASSES[position]}`}
		>
			{toasts.map((toast) => (
				<ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
			))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// useToast — hook for managing the toast queue
// ---------------------------------------------------------------------------

/**
 * Returns a stateful toast queue and helpers:
 *  - toasts: The current array of active ToastMessage items.
 *  - addToast: Function to add a new toast (returns the generated id).
 *  - dismissToast: Function to remove a toast by id.
 */
export function useToast() {
	const [toasts, setToasts] = useState<ToastMessage[]>([]);

	const addToast = useCallback((partial: Omit<ToastMessage, "id">): string => {
		const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const toast: ToastMessage = { ...partial, id };
		setToasts((prev) => [...prev, toast]);
		return id;
	}, []);

	const dismissToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	return { toasts, addToast, dismissToast };
}
