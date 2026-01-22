"use client";

import { useState, useCallback } from "react";
import { copyToClipboard } from "@/utils/copyToClipboard";

interface UseCopyToClipboardReturn {
	copy: (text: string) => Promise<void>;
	copied: boolean;
}

/**
 * Hook for copying text to clipboard with visual feedback state.
 * @param resetDelay - Time in ms before `copied` resets to false (default: 2000)
 */
export function useCopyToClipboard(
	resetDelay = 2000,
): UseCopyToClipboardReturn {
	const [copied, setCopied] = useState(false);

	const copy = useCallback(
		async (text: string) => {
			await copyToClipboard(text);
			setCopied(true);
			setTimeout(() => setCopied(false), resetDelay);
		},
		[resetDelay],
	);

	return { copy, copied };
}
