"use client";

import { useCallback, useState } from "react";
import {
	copyToClipboardWithFallback,
	handleCopyWithFeedback,
	type CopyOptions,
} from "@/utils/copyToClipboardUx";
import { getAddressToCopy, isSafeToCopy } from "@/utils/addressValidation";

interface UseCopyToClipboardUxReturn {
	/** Copy function that handles text and addresses */
	copy: (
		text: string,
		fullAddress?: string,
		options?: CopyOptions,
	) => Promise<boolean>;
	/** Whether text was recently copied */
	copied: boolean;
	/** Error message if copy failed */
	error: string | null;
	/** Whether copy operation is in progress */
	loading: boolean;
	/** Clear the copied state manually */
	reset: () => void;
}

/**
 * Enhanced hook for copying to clipboard with full UX feedback
 * Includes address validation, haptic feedback, and accessibility
 * @param resetDelay - Time in ms before copied state resets (default: 2000)
 */
export function useCopyToClipboardUx(
	resetDelay = 2000,
): UseCopyToClipboardUxReturn {
	const [copied, setCopied] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const copy = useCallback(
		async (
			text: string,
			fullAddress?: string,
			options: CopyOptions = {},
		): Promise<boolean> => {
			setLoading(true);

			try {
				// Clear previous error
				setError(null);

				// Check if this looks like a Stellar address (starts with G)
				if (text.startsWith("G")) {
					// Validate address format
					if (!isSafeToCopy(text, fullAddress)) {
						setError("Invalid address format");
						setLoading(false);
						return false;
					}

					// Get the address to copy (expands truncated if needed)
					const addressToCopy = getAddressToCopy(text, fullAddress);
					if (!addressToCopy) {
						setError("Unable to copy address");
						setLoading(false);
						return false;
					}

					// Copy the validated address with enhanced UX
					await copyToClipboardWithFallback(addressToCopy, {
						feedbackText: `Copied address`,
						hapticFeedback: true,
						announce: true,
						...options,
					});
				} else {
					// For non-address text, copy with feedback
					const result = await handleCopyWithFeedback(text, {
						hapticFeedback: true,
						announce: true,
						...options,
					});

					if (!result.success && result.error) {
						throw result.error;
					}
				}

				setCopied(true);
				const timeoutId = setTimeout(() => setCopied(false), resetDelay);

				return true;
			} catch (err) {
				const errorMessage =
					err instanceof Error
						? err.message
						: "Failed to copy to clipboard";
				setError(errorMessage);
				setCopied(false);
				return false;
			} finally {
				setLoading(false);
			}
		},
		[resetDelay],
	);

	const reset = useCallback(() => {
		setCopied(false);
		setError(null);
		setLoading(false);
	}, []);

	return { copy, copied, error, loading, reset };
}
