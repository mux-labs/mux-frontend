"use client";

import React from "react";
import { AlertCircle, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

interface CopyButtonProps {
	/** Text to copy to clipboard */
	text: string;
	/** Accessible label for screen readers */
	label?: string;
	/** Optional callback when copy succeeds */
	onCopySuccess?: (text: string) => void;
	/** Optional callback when copy fails */
	onCopyError?: (error: string) => void;
	/** Button size variant */
	size?: "icon-sm" | "sm" | "default";
	/** Optional className for additional styling */
	className?: string;
}

/**
 * Reusable copy-to-clipboard button for analytics data.
 * Shows visual feedback (icon changes) and supports accessibility.
 */
export function CopyButton({
	text,
	label,
	onCopySuccess,
	onCopyError,
	size = "icon-sm",
	className = "",
}: CopyButtonProps) {
	const { copy, copied, error } = useCopyToClipboard();

	const handleCopy = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		try {
			const success = await copy(text);
			if (success && onCopySuccess) {
				onCopySuccess(text);
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to copy";
			if (onCopyError) {
				onCopyError(errorMessage);
			}
		}
	};

	// Trigger callbacks on state changes
	React.useEffect(() => {
		if (copied && onCopySuccess) {
			onCopySuccess(text);
		}
	}, [copied, text, onCopySuccess]);

	React.useEffect(() => {
		if (error && onCopyError) {
			onCopyError(error);
		}
	}, [error, onCopyError]);

	const ariaLabel =
		label || (copied ? "Copied to clipboard" : "Copy to clipboard");

	return (
		<Button
			variant="ghost"
			size={size}
			onClick={handleCopy}
			title={error ? error : copied ? "Copied!" : "Copy"}
			disabled={error !== null}
			className={`transition-all hover:scale-110 ${className}`}
			aria-label={ariaLabel}
			data-testid="analytics-copy-button"
		>
			{error ? (
				<AlertCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
			) : copied ? (
				<Check
					className="h-4 w-4 text-green-500 animate-in fade-in zoom-in duration-200"
					aria-hidden="true"
				/>
			) : (
				<Copy
					className="h-4 w-4 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
					aria-hidden="true"
				/>
			)}
		</Button>
	);
}
