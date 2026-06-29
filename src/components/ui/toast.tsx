"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Represents the different types of toast notifications.
 */
export type ToastType = "success" | "error" | "info" | "warning";

/**
 * Represents a single toast notification message.
 */
export interface ToastMessage {
	/** Unique identifier for the toast instance */
	id: string;
	/** The type/severity of the toast */
	type: ToastType;
	/** The primary message text to display */
	message: string;
	/** Optional secondary description providing more detail */
	description?: string;
	/** Duration in ms before auto-dismiss (default: 5000). 0 disables auto-dismiss. */
	duration?: number;
}

/**
 * Props for the ToastContainer component.
 */
export interface ToastContainerProps {
	/** Array of toast messages to display */
	toasts: ToastMessage[];
	/** Callback fired when a toast is dismissed */
	onDismiss: (id: string) => void;
	/**
	 * Position of the toast container on the screen.
	 * @default "top-right"
	 */
	position?:
		| "top-right"
		| "top-left"
		| "bottom-right"
		| "bottom-left"
		| "top-center"
		| "bottom-center";
}

/**
 * Props for an individual ToastItem component.
 */
export interface ToastItemProps {
	/** The toast message data to render */
	toast: ToastMessage;
	/** Callback fired when this toast is dismissed */
	onDismiss: (id: string) => void;
}

// ─── Style Maps ──────────────────────────────────────────────────────────────

const typeStyles: Record<
	ToastType,
	{ bg: string; icon: string; border: string }
> = {
	success: {
		bg: "bg-green-50 dark:bg-green-950",
		icon: "✓",
		border: "border-green-400 dark:border-green-700",
	},
	error: {
		bg: "bg-red-50 dark:bg-red-950",
		icon: "✕",
		border: "border-red-400 dark:border-red-700",
	},
	info: {
		bg: "bg-blue-50 dark:bg-blue-950",
		icon: "ℹ",
		border: "border-blue-400 dark:border-blue-700",
	},
	warning: {
		bg: "bg-amber-50 dark:bg-amber-950",
		icon: "⚠",
		border: "border-amber-400 dark:border-amber-700",
	},
};

const positionClasses: Record<string, string> = {
	"top-right": "top-4 right-4",
	"top-left": "top-4 left-4",
	"bottom-right": "bottom-4 right-4",
	"bottom-left": "bottom-4 left-4",
	"top-center": "top-4 left-1/2 -translate-x-1/2",
	"bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
};

// ─── Individual Toast Item ────────────────────────────────────────────────────

/**
 * A single toast notification item with auto-dismiss functionality.
 * Displays an icon, message, optional description, and a dismiss button.
 */
export function ToastItem({ toast, onDismiss }: ToastItemProps) {
	const styles = typeStyles[toast.type];
	const duration = toast.duration ?? 5000;

	useEffect(() => {
		if (duration <= 0) return;

		const timer = setTimeout(() => {
			onDismiss(toast.id);
		}, duration);

		return () => clearTimeout(timer);
	}, [toast.id, duration, onDismiss]);

	return (
		<div
			role="alert"
			aria-live="assertive"
			className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out ${styles.bg} ${styles.border}`}
		>
			<span className="mt-0.5 text-lg" aria-hidden="true">
				{styles.icon}
			</span>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
					{toast.message}
				</p>
				{toast.description && (
					<p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
						{toast.description}
					</p>
				)}
			</div>
			<button
				type="button"
				onClick={() => onDismiss(toast.id)}
				className="ml-2 shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
				aria-label={`Dismiss ${toast.type} notification`}
			>
				<span aria-hidden="true">&times;</span>
			</button>
		</div>
	);
}

// ─── Toast Container ─────────────────────────────────────────────────────────

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
			className={`fixed z-50 flex flex-col gap-2 w-full max-w-sm ${positionClasses[position]}`}
			aria-label="Notifications"
		>
			{toasts.map((toast) => (
				<ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
			))}
		</div>
	);
}

// ─── useToast Hook ───────────────────────────────────────────────────────────

/**
 * Custom hook for managing toast notifications state.
 *
 * @returns An object containing:
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
