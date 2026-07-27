"use client";

import React, { useCallback, useEffect, useRef } from "react";
import {
	createEnterHandler,
	createEscapeHandler,
	createFocusTrapHandler,
	createListNavigationHandler,
	createShortcutHandler,
	createSpaceHandler,
	type KeyboardKey,
	type ListNavigationOptions,
} from "@/utils/keyboardNavigation";

/**
 * Hook for managing focus trap in modals/dialogs
 */
export function useFocusTrap(isActive = true) {
	const containerRef = useRef<HTMLDivElement>(
		null,
	) as React.RefObject<HTMLElement>;

	useEffect(() => {
		if (!isActive || !containerRef.current) return;

		const handleKeyDown = createFocusTrapHandler(containerRef);

		// Bridge React's synthetic event handler to the native DOM EventListener
		const nativeHandler = (event: Event) => {
			handleKeyDown(event as unknown as React.KeyboardEvent<Element>);
		};

		containerRef.current.addEventListener("keydown", nativeHandler);

		// Auto-focus first focusable element
		const focusableElements = containerRef.current.querySelectorAll(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
		);
		if (focusableElements.length > 0) {
			(focusableElements[0] as HTMLElement).focus();
		}

		return () => {
			containerRef.current?.removeEventListener("keydown", nativeHandler);
		};
	}, [isActive]);

	return containerRef;
}

/**
 * Hook for managing list/menu navigation with keyboard
 */
export function useListNavigation(
	items: HTMLElement[] = [],
	options: ListNavigationOptions = {},
) {
	const [currentIndex, setCurrentIndex] = React.useState(0);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			createListNavigationHandler(items, currentIndex, {
				...options,
				onNavigate: (newIndex) => {
					setCurrentIndex(newIndex);
					options.onNavigate?.(newIndex);
				},
			})(event);
		},
		[items, currentIndex, options],
	);

	return { currentIndex, handleKeyDown };
}

/**
 * Hook for escape key handler (e.g., close modals)
 */
export function useEscapeKey(
	callback: () => void,
	enabled = true,
): (event: React.KeyboardEvent) => void {
	return useCallback(
		(event: React.KeyboardEvent) => {
			if (enabled) {
				createEscapeHandler(callback)(event);
			}
		},
		[callback, enabled],
	);
}

/**
 * Hook for enter key handler
 */
export function useEnterKey(
	callback: () => void,
	enabled = true,
): (event: React.KeyboardEvent) => void {
	return useCallback(
		(event: React.KeyboardEvent) => {
			if (enabled) {
				createEnterHandler(callback)(event);
			}
		},
		[callback, enabled],
	);
}

/**
 * Hook for space key handler (prevents page scroll)
 */
export function useSpaceKey(
	callback: () => void,
	enabled = true,
): (event: React.KeyboardEvent) => void {
	return useCallback(
		(event: React.KeyboardEvent) => {
			if (enabled) {
				createSpaceHandler(callback)(event);
			}
		},
		[callback, enabled],
	);
}

/**
 * Hook for keyboard shortcuts (Ctrl+K, Cmd+K, etc.)
 */
export function useKeyboardShortcut(
	key: KeyboardKey,
	callback: () => void,
	modifiers?: {
		ctrl?: boolean;
		shift?: boolean;
		alt?: boolean;
		meta?: boolean;
	},
	enabled = true,
): void {
	useEffect(() => {
		if (!enabled) return;

		const handler = createShortcutHandler(key, callback, modifiers);

		const onKeyDown = (event: globalThis.KeyboardEvent) => {
			handler(event as unknown as React.KeyboardEvent);
		};

		window.addEventListener("keydown", onKeyDown);

		return () => {
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [key, callback, modifiers, enabled]);
}

/**
 * Hook for managing arrow key navigation in a grid or list
 */
export function useArrowKeyNavigation(
	rows: number,
	cols: number,
	onNavigate: (row: number, col: number) => void,
) {
	const [position, setPosition] = React.useState({ row: 0, col: 0 });

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			const { row, col } = position;

			let newRow = row;
			let newCol = col;
			let handled = false;

			switch (event.key) {
				case "ArrowUp":
					handled = true;
					newRow = Math.max(0, row - 1);
					break;
				case "ArrowDown":
					handled = true;
					newRow = Math.min(rows - 1, row + 1);
					break;
				case "ArrowLeft":
					handled = true;
					newCol = Math.max(0, col - 1);
					break;
				case "ArrowRight":
					handled = true;
					newCol = Math.min(cols - 1, col + 1);
					break;
				case "Home":
					handled = true;
					newCol = 0;
					break;
				case "End":
					handled = true;
					newCol = cols - 1;
					break;
			}

			if (handled) {
				event.preventDefault();
				setPosition({ row: newRow, col: newCol });
				onNavigate(newRow, newCol);
			}
		},
		[position, rows, cols, onNavigate],
	);

	return { position, handleKeyDown };
}
