"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastVariant } from "@/components/ui/toast";

interface ToastState {
	open: boolean;
	message: string;
	variant: ToastVariant;
	title?: string;
}

interface ShowToastOptions {
	variant?: ToastVariant;
	title?: string;
}

interface UseToastReturn {
	toast: ToastState;
	showToast: (message: string, options?: ShowToastOptions) => void;
	hideToast: () => void;
}

export function useToast(duration = 3000): UseToastReturn {
	const [toast, setToast] = useState<ToastState>({
		open: false,
		message: "",
		variant: "success",
	});
	const timerRef = useRef<number | null>(null);

	const showToast = useCallback(
		(message: string, options?: ShowToastOptions) => {
			setToast({
				open: true,
				message,
				variant: options?.variant ?? "success",
				title: options?.title,
			});

			if (timerRef.current !== null) {
				clearTimeout(timerRef.current);
			}

			timerRef.current = window.setTimeout(() => {
				setToast((prev) => ({ ...prev, open: false }));
			}, duration);
		},
		[duration],
	);

	const hideToast = useCallback(() => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		setToast((prev) => ({ ...prev, open: false }));
	}, []);

	useEffect(() => {
		return () => {
			if (timerRef.current !== null) {
				clearTimeout(timerRef.current);
			}
		};
	}, []);

	return { toast, showToast, hideToast };
}
