"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmRevokeDialogProps {
	open: boolean;
	keyLabel?: string;
	isPending?: boolean;
	/** Disables only the confirm action (Cancel stays usable), e.g. while offline. */
	disableConfirm?: boolean;
	/** Shown under the actions when `disableConfirm` is true. */
	confirmDisabledReason?: string;
	onConfirm: () => void;
	onCancel: () => void;
	className?: string;
}

/**
 * Confirmation dialog shown before revoking an API key, so a stray click
 * can't destroy a credential without an explicit second step.
 */
export function ConfirmRevokeDialog({
	open,
	keyLabel,
	isPending = false,
	disableConfirm = false,
	confirmDisabledReason,
	onConfirm,
	onCancel,
	className,
}: ConfirmRevokeDialogProps) {
	const confirmRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (open) confirmRef.current?.focus();
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onCancel();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open, onCancel]);

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			data-testid="confirm-revoke-overlay"
			onClick={onCancel}
		>
			<div
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="confirm-revoke-title"
				aria-describedby="confirm-revoke-description"
				data-testid="confirm-revoke-dialog"
				className={cn(
					"w-full max-w-sm rounded-lg border bg-background p-4 shadow-lg",
					className,
				)}
				onClick={(e) => e.stopPropagation()}
			>
				<h2 id="confirm-revoke-title" className="text-sm font-semibold">
					Revoke API key?
				</h2>
				<p
					id="confirm-revoke-description"
					className="mt-1 text-sm text-muted-foreground"
				>
					{keyLabel
						? `This will immediately revoke "${keyLabel}". Any requests using it will start failing.`
						: "This will immediately revoke the key. Any requests using it will start failing."}{" "}
					This action cannot be undone.
				</p>
				{confirmDisabledReason && disableConfirm && !isPending && (
					<p className="mt-3 text-xs text-amber-700">
						{confirmDisabledReason}
					</p>
				)}
				<div className="mt-4 flex justify-end gap-2">
					<Button variant="outline" onClick={onCancel} disabled={isPending}>
						Cancel
					</Button>
					<Button
						ref={confirmRef}
						variant="destructive"
						onClick={onConfirm}
						disabled={isPending || disableConfirm}
					>
						{isPending ? "Revoking…" : "Revoke key"}
					</Button>
				</div>
			</div>
		</div>
	);
}
