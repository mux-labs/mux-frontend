"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmArchiveDialogProps {
	open: boolean;
	walletLabel?: string;
	isPending?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
	className?: string;
}

/**
 * Confirmation dialog shown before archiving a wallet, mirroring
 * ConfirmRevokeDialog so a stray click can't hide a wallet from
 * monitoring without an explicit second step.
 */
export function ConfirmArchiveDialog({
	open,
	walletLabel,
	isPending = false,
	onConfirm,
	onCancel,
	className,
}: ConfirmArchiveDialogProps) {
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
			data-testid="confirm-archive-overlay"
			onClick={onCancel}
		>
			<div
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="confirm-archive-title"
				aria-describedby="confirm-archive-description"
				data-testid="confirm-archive-dialog"
				className={cn(
					"w-full max-w-sm rounded-lg border bg-background p-4 shadow-lg",
					className,
				)}
				onClick={(e) => e.stopPropagation()}
			>
				<h2 id="confirm-archive-title" className="text-sm font-semibold">
					Archive wallet?
				</h2>
				<p
					id="confirm-archive-description"
					className="mt-1 text-sm text-muted-foreground"
				>
					{walletLabel
						? `"${walletLabel}" will be hidden from the default wallets list. `
						: "This wallet will be hidden from the default wallets list. "}
					You can reveal it later with the "Show archived" toggle.
				</p>
				<div className="mt-4 flex justify-end gap-2">
					<Button variant="outline" onClick={onCancel} disabled={isPending}>
						Cancel
					</Button>
					<Button
						ref={confirmRef}
						variant="destructive"
						onClick={onConfirm}
						disabled={isPending}
					>
						{isPending ? "Archiving…" : "Archive wallet"}
					</Button>
				</div>
			</div>
		</div>
	);
}
