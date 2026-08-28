"use client";

import {
	AlertCircle,
	Check,
	Copy,
	QrCode as QrCodeIcon,
	X,
} from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import type { Wallet } from "@/types/wallet";
import { isValidStellarAddress } from "@/utils/addressValidation";
import { createFocusTrapHandler } from "@/utils/keyboardNavigation";
import { QRDownloadButton } from "./QRDownloadButton";
import { QrCode } from "./QrCode";

interface ReceiveWalletModalProps {
	isOpen: boolean;
	wallet: Wallet | null;
	onClose: () => void;
}

export default function ReceiveWalletModal({
	isOpen,
	wallet,
	onClose,
}: ReceiveWalletModalProps) {
	const titleId = useId();
	const descriptionId = useId();
	const dialogRef = useRef<HTMLDivElement>(null);
	const { copy, copied, error } = useCopyToClipboard();

	const address = wallet?.address.trim() ?? "";
	const isValidAddress = !!wallet && isValidStellarAddress(address);
	const isWalletStale =
		!!wallet && (wallet.status === "pending" || wallet.status === "inactive");

	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			aria-describedby={descriptionId}
			ref={dialogRef}
			onKeyDown={(event) => {
				createFocusTrapHandler(dialogRef)(event);
			}}
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
		>
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
				aria-hidden="true"
			/>

			<div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
				<div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900">
							<QrCodeIcon className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
						</div>
						<div>
							<h2
								id={titleId}
								className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
							>
								Receive funds
							</h2>
							<p className="text-sm text-zinc-500 dark:text-zinc-400">
								Scan the QR code or copy the wallet address.
							</p>
						</div>
					</div>

					<Button
						variant="ghost"
						size="icon-sm"
						onClick={onClose}
						aria-label="Close receive dialog"
						autoFocus
					>
						<X className="h-4 w-4" aria-hidden="true" />
					</Button>
				</div>

				<div id={descriptionId} className="px-6 py-6">
					{!wallet ? (
						<div
							role="alert"
							className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
						>
							Receive details are unavailable until a wallet is loaded.
						</div>
					) : !isValidAddress ? (
						<div className="space-y-4">
							<div
								role="alert"
								className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100"
							>
								This wallet address is not valid yet, so a receive QR cannot be
								shown.
							</div>
							<div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300">
								<code className="break-all font-mono">{wallet.address}</code>
							</div>
						</div>
					) : (
						<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
							<div className="space-y-4">
								<QrCode value={address} size={240} className="mx-auto" />
								<div className="space-y-2">
									<p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
										Wallet address
									</p>
									<div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/60">
										<code className="min-w-0 flex-1 break-all font-mono text-sm text-zinc-800 dark:text-zinc-200">
											{address}
										</code>
										<Button
											variant="outline"
											size="sm"
											onClick={() => copy(address, address)}
											title={error ? error : copied ? "Copied" : "Copy address"}
											aria-label={
												copied ? "Address copied" : "Copy wallet address"
											}
										>
											{error ? (
												<AlertCircle
													className="h-4 w-4 text-red-500"
													aria-hidden="true"
												/>
											) : copied ? (
												<Check
													className="h-4 w-4 text-green-600"
													aria-hidden="true"
												/>
											) : (
												<Copy className="h-4 w-4" aria-hidden="true" />
											)}
											{copied ? "Copied" : "Copy"}
										</Button>
									</div>
									{error && (
										<p
											role="alert"
											className="text-sm text-red-600 dark:text-red-400"
										>
											{error}
										</p>
									)}
								</div>
							</div>

							<div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
								<div className="space-y-1">
									<p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
										Save this QR code
									</p>
									<p className="text-sm text-zinc-600 dark:text-zinc-300">
										Download the QR code as an SVG file to share the receive
										address offline.
									</p>
								</div>

								{isWalletStale && (
									<div
										role="status"
										className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100"
									>
										This wallet is {wallet.status}, so receive details may lag
										behind the latest on-chain state.
									</div>
								)}

								<QRDownloadButton
									address={address}
									className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
								/>
							</div>
						</div>
					)}
				</div>

				<div className="flex justify-end gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
					<Button variant="outline" onClick={onClose}>
						Close
					</Button>
				</div>
			</div>
		</div>
	);
}
