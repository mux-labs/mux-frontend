"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastVariant = "success" | "error" | "info" | "warning";

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
			strokeWidth={2}
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
	),
	error: (
		<svg
			className="h-5 w-5 text-red-500"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={2}
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
			/>
		</svg>
	),
	info: (
		<svg
			className="h-5 w-5 text-blue-500"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={2}
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
			/>
		</svg>
	),
	warning: (
		<svg
			className="h-5 w-5 text-yellow-500"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={2}
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
			/>
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
			<div className="mt-0.5 shrink-0">{ICONS[type]}</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
					{LABELS[type]}
				</p>
				<p className="text-sm text-zinc-700 dark:text-zinc-300">{message}</p>
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
				className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
			>
				<svg
					className="h-4 w-4"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth={2}
					stroke="currentColor"
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>
	);
}

// ---------------------------------------------------------------------------
// ToastContainer — stacks multiple toasts
// ---------------------------------------------------------------------------

type ToastPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";

interface ToastContainerProps {
	toasts: ToastMessage[];
	onDismiss: (id: string) => void;
	position?: ToastPosition;
}

const POSITION_CLASSES: Record<ToastPosition, string> = {
	"top-right": "top-4 right-4",
	"top-left": "top-4 left-4",
	"bottom-right": "bottom-4 right-4",
	"bottom-left": "bottom-4 left-4",
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
			className={cn(
				"fixed z-50 flex flex-col gap-2 pointer-events-none",
				POSITION_CLASSES[position],
			)}
		>
			{toasts.map((toast) => (
				<div key={toast.id} className="pointer-events-auto">
					<ToastItem toast={toast} onDismiss={onDismiss} />
				</div>
			))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// useToast — hook for managing toast state
// ---------------------------------------------------------------------------

interface AddToastOptions {
	type: ToastType;
	message: string;
	description?: string;
	duration?: number;
}

interface UseToastReturn {
	toasts: ToastMessage[];
	addToast: (options: AddToastOptions) => string;
	dismissToast: (id: string) => void;
}

export function useToast(): UseToastReturn {
	const [toasts, setToasts] = useState<ToastMessage[]>([]);

	const addToast = useCallback((options: AddToastOptions): string => {
		const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
		setToasts((prev) => [...prev, { ...options, id }]);
		return id;
	}, []);

	const dismissToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	return { toasts, addToast, dismissToast };
}

// ---------------------------------------------------------------------------
// Toast — simpler single-toast component (used by toast.test.tsx / useToast hook)
// ---------------------------------------------------------------------------

export type { ToastVariant as default };

interface ToastProps {
	open: boolean;
	message: string;
	variant?: ToastVariant;
	title?: string;
	onClose?: () => void;
}

const VARIANT_DEFAULTS: Record<ToastVariant, string> = {
	success: "Success",
	error: "Error",
	info: "Info",
	warning: "Warning",
};

const VARIANT_ICONS: Record<ToastVariant, React.ReactNode> = {
	success: (
		<svg
			className="h-5 w-5 text-green-500 shrink-0"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={2}
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
	),
	error: (
		<svg
			className="h-5 w-5 text-red-500 shrink-0"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={2}
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
			/>
		</svg>
	),
	info: (
		<svg
			className="h-5 w-5 text-blue-500 shrink-0"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={2}
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
			/>
		</svg>
	),
	warning: (
		<svg
			className="h-5 w-5 text-yellow-500 shrink-0"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={2}
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
			/>
		</svg>
	),
};

export function Toast({
	open,
	message,
	variant = "success",
	title,
	onClose,
}: ToastProps) {
	if (!open) return null;

	const resolvedTitle = title ?? VARIANT_DEFAULTS[variant];

	return (
		<div
			role="status"
			aria-live="polite"
			className={cn(
				"flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg dark:bg-zinc-900",
				variant === "success" && "border-green-200 dark:border-green-800",
				variant === "error" && "border-red-200 dark:border-red-800",
				variant === "info" && "border-blue-200 dark:border-blue-800",
				variant === "warning" && "border-yellow-200 dark:border-yellow-800",
			)}
		>
			{VARIANT_ICONS[variant]}
			<div className="flex-1 min-w-0">
				<p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
					{resolvedTitle}
				</p>
				<p className="text-sm text-zinc-700 dark:text-zinc-300">{message}</p>
			</div>
			{onClose && (
				<button
					type="button"
					onClick={onClose}
					aria-label="Dismiss notification"
					className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
				>
					<svg
						className="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={2}
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			)}
		</div>
	);
}
