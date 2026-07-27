"use client";

import { AlertCircle, Check, Copy, Loader2 } from "lucide-react";
import { useCallback } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useCopyToClipboardUx } from "@/hooks/useCopyToClipboardUx";
import { generateCopyTitle, getCopyAriaLabel } from "@/utils/copyToClipboardUx";

interface CopyButtonProps extends Omit<ButtonProps, "onClick" | "type"> {
	/** Text to copy to clipboard */
	text: string;
	/** Full address if text is truncated (for validation) */
	fullAddress?: string;
	/** Type of content being copied */
	type?: "address" | "key" | "code" | "text";
	/** Custom label for the button */
	label?: React.ReactNode;
	/** Show icon only (no label) */
	iconOnly?: boolean;
	/** Custom success message */
	successMessage?: string;
	/** Duration to show success state (ms) */
	successDuration?: number;
	/** Callback when copy succeeds */
	onCopySuccess?: (text: string) => void;
	/** Callback when copy fails */
	onCopyError?: (error: string) => void;
	/** Show feedback toast (handled by parent or external) */
	showFeedback?: boolean;
}

/**
 * Enhanced copy button with full UX feedback
 * Shows loading state, success confirmation, and error messages
 * Includes accessibility features and haptic feedback
 */
export function CopyButton({
	text,
	fullAddress,
	type = "text",
	label,
	iconOnly = false,
	successMessage,
	successDuration = 2000,
	onCopySuccess,
	onCopyError,
	showFeedback = true,
	disabled,
	className,
	variant = "ghost",
	size = "icon-sm",
	...props
}: CopyButtonProps) {
	const { copy, copied, error, loading } =
		useCopyToClipboardUx(successDuration);

	const handleClick = useCallback(async () => {
		const success = await copy(text, fullAddress, {
			feedbackText: successMessage,
		});

		if (success) {
			onCopySuccess?.(text);
		} else {
			onCopyError?.(error || "Copy failed");
		}
	}, [
		copy,
		text,
		fullAddress,
		successMessage,
		onCopySuccess,
		onCopyError,
		error,
	]);

	// Determine button state
	const isDisabled = disabled || loading || !!error;
	const title = generateCopyTitle(copied, error, type);
	const ariaLabel = getCopyAriaLabel(type, copied);

	// Icon selection
	const getIcon = () => {
		if (error) {
			return <AlertCircle className="h-4 w-4 text-red-500" />;
		}
		if (copied) {
			return <Check className="h-4 w-4 text-green-500" />;
		}
		if (loading) {
			return <Loader2 className="h-4 w-4 animate-spin" />;
		}
		return <Copy className="h-4 w-4" />;
	};

	// Determine styling based on state
	const getClassName = () => {
		let classes = className || "";

		if (error) {
			classes += " hover:bg-red-50 dark:hover:bg-red-900/20";
		} else if (copied) {
			classes +=
				" bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40";
		}

		return classes;
	};

	if (iconOnly) {
		return (
			<Button
				variant={variant}
				size={size}
				onClick={handleClick}
				disabled={isDisabled}
				title={title}
				aria-label={ariaLabel}
				className={getClassName()}
				{...props}
			>
				{getIcon()}
			</Button>
		);
	}

	// Button with label
	const buttonLabel = label || (
		<span className="flex items-center gap-2">
			{getIcon()}
			<span className="text-sm">
				{copied ? "Copied" : error ? "Error" : "Copy"}
			</span>
		</span>
	);

	return (
		<Button
			variant={variant}
			onClick={handleClick}
			disabled={isDisabled}
			title={title}
			aria-label={ariaLabel}
			className={getClassName()}
			{...props}
		>
			{buttonLabel}
		</Button>
	);
}

/**
 * Compact inline copy button for use in text/code blocks
 * Shows minimal UI, suitable for addresses and keys
 */
export function InlineCopyButton({
	text,
	fullAddress,
	type = "text",
	onCopySuccess,
	onCopyError,
	...props
}: Omit<CopyButtonProps, "label" | "iconOnly" | "showFeedback">) {
	return (
		<CopyButton
			text={text}
			fullAddress={fullAddress}
			type={type}
			iconOnly
			size="sm"
			variant="ghost"
			className="h-6 w-6 p-0"
			onCopySuccess={onCopySuccess}
			onCopyError={onCopyError}
			{...props}
		/>
	);
}
