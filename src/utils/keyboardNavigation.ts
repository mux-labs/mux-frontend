/**
 * Keyboard navigation utilities for improved accessibility
 * Provides reusable keyboard handling patterns for common UI interactions
 */

export type KeyboardKey =
	| "Enter"
	| "Escape"
	| " "
	| "ArrowUp"
	| "ArrowDown"
	| "ArrowLeft"
	| "ArrowRight"
	| "Home"
	| "End"
	| "Tab"
	| "Shift"
	| "Control"
	| "Alt"
	| "Meta";

export interface KeyboardEvent {
	key: KeyboardKey;
	ctrlKey: boolean;
	shiftKey: boolean;
	altKey: boolean;
	metaKey: boolean;
	preventDefault: () => void;
	stopPropagation: () => void;
}

export type KeyboardHandler = (event: KeyboardEvent) => void | boolean;

/**
 * Parse keyboard event and normalize it
 */
export function parseKeyboardEvent(
	event: React.KeyboardEvent,
): KeyboardEvent {
	return {
		key: event.key as KeyboardKey,
		ctrlKey: event.ctrlKey,
		shiftKey: event.shiftKey,
		altKey: event.altKey,
		metaKey: event.metaKey,
		preventDefault: () => event.preventDefault(),
		stopPropagation: () => event.stopPropagation(),
	};
}

/**
 * Check if a key matches (case-insensitive)
 */
export function isKey(event: KeyboardEvent, key: KeyboardKey): boolean {
	return event.key.toLowerCase() === key.toLowerCase();
}

/**
 * Check if multiple keys are pressed
 */
export function isKeyCombo(
	event: KeyboardEvent,
	key: KeyboardKey,
	modifiers?: {
		ctrl?: boolean;
		shift?: boolean;
		alt?: boolean;
		meta?: boolean;
	},
): boolean {
	if (!isKey(event, key)) return false;

	if (modifiers?.ctrl && !event.ctrlKey) return false;
	if (modifiers?.shift && !event.shiftKey) return false;
	if (modifiers?.alt && !event.altKey) return false;
	if (modifiers?.meta && !event.metaKey) return false;

	return true;
}

/**
 * Handle navigation arrow keys
 * Returns: 'up' | 'down' | 'left' | 'right' | null
 */
export function getArrowDirection(
	event: KeyboardEvent,
): "up" | "down" | "left" | "right" | null {
	if (isKey(event, "ArrowUp")) return "up";
	if (isKey(event, "ArrowDown")) return "down";
	if (isKey(event, "ArrowLeft")) return "left";
	if (isKey(event, "ArrowRight")) return "right";
	return null;
}

/**
 * Create a focus trap handler for modal/dialog
 * Keeps focus within specified elements
 */
export function createFocusTrapHandler(
	containerRef: React.RefObject<HTMLElement | null>,
): (event: React.KeyboardEvent) => void {
	return (event: React.KeyboardEvent) => {
		if (!isKey(parseKeyboardEvent(event), "Tab")) return;

		const container = containerRef.current;
		if (!container) return;

		const focusableElements = getFocusableElements(container);

		if (focusableElements.length === 0) return;

		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];
		const activeElement = document.activeElement;

		// Handle Shift+Tab
		if (event.shiftKey) {
			if (activeElement === firstElement) {
				event.preventDefault();
				lastElement.focus();
			}
		}
		// Handle Tab
		else {
			if (activeElement === lastElement) {
				event.preventDefault();
				firstElement.focus();
			}
		}
	};
}

/**
 * Handle list/menu keyboard navigation
 * Supports arrow keys, Home, End, Enter, and Escape
 */
export interface ListNavigationOptions {
	/** Callback when item is selected */
	onSelect?: (index: number) => void;
	/** Callback when navigation occurs */
	onNavigate?: (index: number) => void;
	/** Callback when escape is pressed */
	onEscape?: () => void;
	/** Allow wrapping from end to start */
	wrapAround?: boolean;
}

export function createListNavigationHandler(
	items: HTMLElement[],
	currentIndex: number,
	options: ListNavigationOptions = {},
): (event: React.KeyboardEvent) => void {
	return (event: React.KeyboardEvent) => {
		const ke = parseKeyboardEvent(event);
		const { onSelect, onNavigate, onEscape, wrapAround = true } = options;
		const itemCount = items.length;

		if (itemCount === 0) return;

		const direction = getArrowDirection(ke);
		let newIndex = currentIndex;
		let handled = false;

		// Arrow down or right
		if (direction === "down" || direction === "right") {
			handled = true;
			newIndex = currentIndex + 1;
			if (newIndex >= itemCount) {
				newIndex = wrapAround ? 0 : itemCount - 1;
			}
		}
		// Arrow up or left
		else if (direction === "up" || direction === "left") {
			handled = true;
			newIndex = currentIndex - 1;
			if (newIndex < 0) {
				newIndex = wrapAround ? itemCount - 1 : 0;
			}
		}
		// Home
		else if (isKey(ke, "Home")) {
			handled = true;
			newIndex = 0;
		}
		// End
		else if (isKey(ke, "End")) {
			handled = true;
			newIndex = itemCount - 1;
		}
		// Enter or Space
		else if (isKey(ke, "Enter") || isKey(ke, " ")) {
			handled = true;
			onSelect?.(currentIndex);
		}
		// Escape
		else if (isKey(ke, "Escape")) {
			handled = true;
			onEscape?.();
		}

		if (handled) {
			ke.preventDefault();
			if (newIndex !== currentIndex) {
				items[newIndex]?.focus();
				onNavigate?.(newIndex);
			}
		}
	};
}

/**
 * Manage tab focus order programmatically
 */
export function setTabIndex(
	element: HTMLElement | null,
	index: number,
): void {
	if (!element) return;
	if (index === -1) {
		element.removeAttribute("tabindex");
	} else {
		element.setAttribute("tabindex", String(index));
	}
}

/**
 * Focus an element with optional scroll into view
 */
export function focusElement(
	element: HTMLElement | null,
	options?: { preventScroll?: boolean },
): void {
	if (!element) return;
	element.focus(options);
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(
	container: HTMLElement,
): HTMLElement[] {
	const selectors = [
		"button:not([disabled])",
		"a[href]",
		"input:not([disabled])",
		"select:not([disabled])",
		"textarea:not([disabled])",
		'[tabindex]:not([tabindex="-1"])',
	];

	return Array.from(
		container.querySelectorAll(selectors.join(", ")),
	) as HTMLElement[];
}

/**
 * Create a keyboard shortcut handler
 * Supports Ctrl+K, Cmd+K, etc.
 */
export function createShortcutHandler(
	key: KeyboardKey,
	callback: () => void,
	modifiers: {
		ctrl?: boolean;
		shift?: boolean;
		alt?: boolean;
		meta?: boolean;
	} = { ctrl: true },
): (event: React.KeyboardEvent) => void {
	return (event: React.KeyboardEvent) => {
		if (isKeyCombo(parseKeyboardEvent(event), key, modifiers)) {
			event.preventDefault();
			callback();
		}
	};
}

/**
 * Escape key handler
 */
export function createEscapeHandler(
	callback: () => void,
): (event: React.KeyboardEvent) => void {
	return (event: React.KeyboardEvent) => {
		if (isKey(parseKeyboardEvent(event), "Escape")) {
			event.preventDefault();
			callback();
		}
	};
}

/**
 * Enter key handler for buttons and forms
 */
export function createEnterHandler(
	callback: () => void,
): (event: React.KeyboardEvent) => void {
	return (event: React.KeyboardEvent) => {
		const ke = parseKeyboardEvent(event);
		if (isKey(ke, "Enter") && !ke.shiftKey) {
			event.preventDefault();
			callback();
		}
	};
}

/**
 * Space key handler (with prevention of page scroll)
 */
export function createSpaceHandler(
	callback: () => void,
): (event: React.KeyboardEvent) => void {
	return (event: React.KeyboardEvent) => {
		if (isKey(parseKeyboardEvent(event), " ")) {
			event.preventDefault();
			callback();
		}
	};
}

/**
 * Announce keyboard shortcuts to screen readers
 */
export function announceShortcut(shortcutName: string, description: string): void {
	const announcement = document.createElement("div");
	announcement.setAttribute("role", "status");
	announcement.setAttribute("aria-live", "polite");
	announcement.className = "sr-only";
	announcement.textContent = `Shortcut: ${shortcutName} - ${description}`;

	document.body.appendChild(announcement);
	setTimeout(() => announcement.remove(), 1000);
}

/**
 * Create an accessible skip link
 */
export function createSkipLink(
	targetId: string,
	label = "Skip to main content",
): HTMLAnchorElement {
	const link = document.createElement("a");
	link.href = `#${targetId}`;
	link.textContent = label;
	link.className = "sr-only focus:not-sr-only";
	link.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    z-index: 9999;
    padding: 0.5rem;
    background: #000;
    color: #fff;
  `;

	return link;
}

/**
 * Get keyboard shortcut description for display
 */
export function getShortcutDisplay(
	key: KeyboardKey,
	modifiers?: {
		ctrl?: boolean;
		shift?: boolean;
		alt?: boolean;
		meta?: boolean;
	},
): string {
	const parts: string[] = [];

	if (modifiers?.ctrl) {
		parts.push(navigator.platform.includes("Mac") ? "⌘" : "Ctrl");
	}
	if (modifiers?.shift) parts.push("Shift");
	if (modifiers?.alt) parts.push("Alt");

	parts.push(key);

	return parts.join("+");
}
