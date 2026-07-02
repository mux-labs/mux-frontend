/**
 * Enhanced copy-to-clipboard utilities for improved UX
 * Provides feedback states, notifications, and accessibility features
 */

export interface CopyState {
	copied: boolean;
	loading: boolean;
	error: string | null;
}

export interface CopyOptions {
	/** Text to display in feedback/notification */
	feedbackText?: string;
	/** Duration to show feedback (ms) */
	feedbackDuration?: number;
	/** Callback when copy succeeds */
	onSuccess?: (text: string) => void;
	/** Callback when copy fails */
	onError?: (error: Error) => void;
	/** Enable haptic feedback on supported devices */
	hapticFeedback?: boolean;
	/** Announce to screen readers */
	announce?: boolean;
}

/**
 * Copies text to clipboard with comprehensive error handling
 * Supports both modern Clipboard API and legacy fallback
 */
export async function copyToClipboardWithFallback(
	text: string,
	options?: CopyOptions,
): Promise<boolean> {
	try {
		// Try modern Clipboard API first
		if (navigator?.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
		} else {
			// Fallback for older browsers
			const textArea = document.createElement("textarea");
			textArea.value = text;
			textArea.style.position = "fixed";
			textArea.style.left = "-9999px";
			textArea.style.top = "-9999px";
			document.body.appendChild(textArea);

			try {
				const success = document.execCommand("copy");
				document.body.removeChild(textArea);

				if (!success) {
					throw new Error("Failed to copy via legacy method");
				}
			} catch (err) {
				document.body.removeChild(textArea);
				throw err;
			}
		}

		// Success callbacks and feedback
		options?.onSuccess?.(text);

		// Haptic feedback if available
		if (options?.hapticFeedback && typeof window !== "undefined") {
			try {
				navigator.vibrate?.(10);
			} catch {
				// Haptic API not available
			}
		}

		// Screen reader announcement
		if (options?.announce) {
			announceToScreenReader(
				options.feedbackText || `Copied: ${text.slice(0, 50)}`,
			);
		}

		return true;
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		options?.onError?.(err);
		throw err;
	}
}

/**
 * Announce text to screen readers using aria-live regions
 */
export function announceToScreenReader(message: string): void {
	// Find or create announcement region
	let announcer = document.getElementById("copy-announcer");

	if (!announcer) {
		announcer = document.createElement("div");
		announcer.id = "copy-announcer";
		announcer.setAttribute("role", "status");
		announcer.setAttribute("aria-live", "polite");
		announcer.setAttribute("aria-atomic", "true");
		announcer.style.position = "absolute";
		announcer.style.left = "-10000px";
		announcer.style.width = "1px";
		announcer.style.height = "1px";
		announcer.style.overflow = "hidden";
		document.body.appendChild(announcer);
	}

	// Clear previous message and announce new one
	announcer.textContent = message;

	// Ensure announcement is heard
	setTimeout(() => {
		announcer!.textContent = "";
	}, 1000);
}

/**
 * Format text for copy feedback
 * Truncates long strings and preserves important parts
 */
export function formatCopyFeedback(text: string, maxLength = 50): string {
	if (text.length <= maxLength) {
		return `Copied: ${text}`;
	}

	const start = text.slice(0, maxLength / 2 - 2);
	const end = text.slice(-(maxLength / 2 - 2));
	return `Copied: ${start}...${end}`;
}

/**
 * Get user-friendly copy description
 */
export function getCopyDescription(
	type: "address" | "key" | "code" | "text" = "text",
): string {
	const descriptions: Record<string, string> = {
		address: "Copy address to clipboard",
		key: "Copy API key to clipboard",
		code: "Copy recovery code to clipboard",
		text: "Copy to clipboard",
	};
	return descriptions[type] || descriptions.text;
}

/**
 * Get aria-label for copy button
 */
export function getCopyAriaLabel(
	type: "address" | "key" | "code" | "text" = "text",
	isCopied = false,
): string {
	if (isCopied) {
		const labels: Record<string, string> = {
			address: "Address copied to clipboard",
			key: "API key copied to clipboard",
			code: "Recovery code copied to clipboard",
			text: "Copied to clipboard",
		};
		return labels[type] || labels.text;
	}

	return getCopyDescription(type);
}

/**
 * Check if copy operation should be allowed
 * Returns error message if copy should be blocked, null if allowed
 */
export function checkCopyAllowed(
	value: string,
	allowEmpty = false,
): string | null {
	if (!value && !allowEmpty) {
		return "Nothing to copy";
	}

	if (typeof value !== "string") {
		return "Invalid content to copy";
	}

	if (value.length > 10000) {
		return "Content too large to copy";
	}

	return null;
}

/**
 * Handle copy with automatic feedback
 * Returns object with success status and feedback text
 */
export async function handleCopyWithFeedback(
	text: string,
	options: CopyOptions = {},
): Promise<{
	success: boolean;
	feedbackText: string;
	error?: Error;
}> {
	// Check if copy is allowed
	const blockReason = checkCopyAllowed(text);
	if (blockReason) {
		return {
			success: false,
			feedbackText: blockReason,
		};
	}

	try {
		await copyToClipboardWithFallback(text, options);
		return {
			success: true,
			feedbackText: options.feedbackText || formatCopyFeedback(text),
		};
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		return {
			success: false,
			feedbackText: `Copy failed: ${err.message}`,
			error: err,
		};
	}
}

/**
 * Create a copy button handler with full UX
 * Handles state updates, feedback, and accessibility
 */
export function createCopyButtonHandler(
	options: CopyOptions = {},
): (text: string) => Promise<boolean> {
	return async (text: string): Promise<boolean> => {
		const result = await handleCopyWithFeedback(text, options);
		return result.success;
	};
}

/**
 * Copy multiple items and provide batch feedback
 */
export async function copyMultiple(
	items: Array<{ text: string; label?: string }>,
	separator = "\n",
): Promise<{ success: boolean; copied: string; count: number }> {
	try {
		const combined = items.map((item) => item.text).join(separator);
		await copyToClipboardWithFallback(combined);

		return {
			success: true,
			copied: combined,
			count: items.length,
		};
	} catch (error) {
		throw error instanceof Error
			? error
			: new Error("Failed to copy multiple items");
	}
}

/**
 * Generate copy button title text with state
 */
export function generateCopyTitle(
	copied: boolean,
	error: string | null,
	type: "address" | "key" | "code" | "text" = "text",
): string {
	if (error) {
		return error;
	}

	if (copied) {
		const copiedTexts: Record<string, string> = {
			address: "Address copied!",
			key: "Key copied!",
			code: "Code copied!",
			text: "Copied!",
		};
		return copiedTexts[type] || copiedTexts.text;
	}

	return getCopyDescription(type);
}

/**
 * Export all items from an object as text
 * Useful for exporting wallet info, settings, etc.
 */
export function exportAsText(
	data: Record<string, unknown>,
	title?: string,
): string {
	const lines: string[] = [];

	if (title) {
		lines.push(title);
		lines.push("=".repeat(title.length));
		lines.push("");
	}

	for (const [key, value] of Object.entries(data)) {
		if (value !== null && value !== undefined) {
			const displayKey = key.replace(/([A-Z])/g, " $1").toLowerCase();
			lines.push(`${displayKey}: ${String(value)}`);
		}
	}

	return lines.join("\n");
}
