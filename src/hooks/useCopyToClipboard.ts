"use client";

import { useCallback, useState } from "react";
import { getAddressToCopy, isSafeToCopy } from "@/utils/addressValidation";
import { copyToClipboard } from "@/utils/copyToClipboard";

interface UseCopyToClipboardReturn {
	copy: (text: string, fullAddress?: string) => Promise<boolean>;
	copied: boolean;
	error: string | null;
}

/**
 * Hook for copying text to clipboard with visual feedback state.
 * Includes address validation for Stellar addresses.
 * @param resetDelay - Time in ms before `copied` resets to false (default: 2000)
 */
export function useCopyToClipboard(
	resetDelay = 2000,
): UseCopyToClipboardReturn {
	const [copied, setCopied] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const copy = useCallback(
		async (text: string, fullAddress?: string): Promise<boolean> => {
			try {
				// Clear previous error
				setError(null);

				// Check if this looks like a Stellar address (starts with G)
				if (text.startsWith("G")) {
					// Validate address format
					if (!isSafeToCopy(text, fullAddress)) {
						setError("Invalid address format");
						return false;
					}

					// Get the address to copy (expands truncated if needed)
					const addressToCopy = getAddressToCopy(text, fullAddress);
					if (!addressToCopy) {
						setError("Unable to copy address");
						return false;
					}

					// Copy the validated address
					await copyToClipboard(addressToCopy);
				} else {
					// For non-address text, copy as-is
					await copyToClipboard(text);
				}

				setCopied(true);
				setTimeout(() => setCopied(false), resetDelay);
				return true;
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to copy to clipboard";
				setError(errorMessage);
				setCopied(false);
				return false;
			}
		},
		[resetDelay],
	);

	return { copy, copied, error };
}
