"use client";

import { AlertCircle, SendHorizonal, WifiOff, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import type { Wallet } from "@/types/wallet";
import { isValidStellarAddress } from "@/utils/addressValidation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { createFocusTrapHandler } from "@/utils/keyboardNavigation";

interface SendWalletModalProps {
	isOpen: boolean;
	wallet: Wallet | null;
	onClose: () => void;
}

interface FormErrors {
	destination?: string;
	amount?: string;
}

function parseBalance(balance: string | undefined): number | null {
	if (!balance) return null;
	const numeric = balance.replace(/[^0-9.]/g, "");
	const value = Number.parseFloat(numeric);
	return Number.isNaN(value) ? null : value;
}

function validateSendForm(
	destination: string,
	amount: string,
	maxBalance: number | null,
): FormErrors {
	const errors: FormErrors = {};

	if (!destination.trim()) {
		errors.destination = "Destination address is required.";
	} else if (!isValidStellarAddress(destination.trim())) {
		errors.destination =
			"Enter a valid Stellar address (starts with G, 56 characters).";
	}

	if (!amount.trim()) {
		errors.amount = "Amount is required.";
	} else {
		const parsed = Number.parseFloat(amount);
		if (Number.isNaN(parsed) || parsed <= 0) {
			errors.amount = "Enter a positive amount.";
		} else if (maxBalance !== null && parsed > maxBalance) {
			errors.amount = `Amount exceeds available balance (${maxBalance} XLM).`;
		}
	}

	return errors;
}

export function SendWalletModal({
	isOpen,
	wallet,
	onClose,
}: SendWalletModalProps) {
	const titleId = useId();
	const destinationId = useId();
	const amountId = useId();
	const destinationErrorId = useId();
	const amountErrorId = useId();
	const dialogRef = useRef<HTMLDivElement>(null);

	const [destination, setDestination] = useState("");
	const [amount, setAmount] = useState("");
	const [errors, setErrors] = useState<FormErrors>({});
	const [touched, setTouched] = useState<{
		destination?: boolean;
		amount?: boolean;
	}>({});
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const isOffline = useOfflineStatus();

	const maxBalance = wallet ? parseBalance(wallet.balance) : null;

	const handleClose = () => {
		setDestination("");
		setAmount("");
		setErrors({});
		setTouched({});
		setSubmitError(null);
		onClose();
	};

	const handleBlur = (field: "destination" | "amount") => {
		setTouched((prev) => ({ ...prev, [field]: true }));
		const newErrors = validateSendForm(destination, amount, maxBalance);
		setErrors(newErrors);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setTouched({ destination: true, amount: true });
		const newErrors = validateSendForm(destination, amount, maxBalance);
		setErrors(newErrors);
		if (Object.keys(newErrors).length > 0) return;

		if (isOffline) {
			setSubmitError(
				"You're offline. Sending is paused until your connection is back.",
			);
			return;
		}

		setSubmitting(true);
		setSubmitError(null);
		try {
			const res = await fetchWithAuth("/api/transactions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					from: wallet?.address,
					to: destination.trim(),
					amountXlm: amount.trim(),
					network: wallet?.network ?? "testnet",
				}),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}) as { error?: string });
				throw new Error(data?.error || `Request failed: ${res.status}`);
			}

			handleClose();
		} catch (err) {
			setSubmitError(
				err instanceof Error ? err.message : "Unable to send funds.",
			);
		} finally {
			setSubmitting(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			ref={dialogRef}
			onKeyDown={(event) => {
				createFocusTrapHandler(dialogRef)(event);
				if (event.key === "Escape") {
					event.preventDefault();
					handleClose();
				}
			}}
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
		>
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={handleClose}
				aria-hidden="true"
			/>

			<div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
				<div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100">
							<SendHorizonal
								className="h-5 w-5 text-neutral-700"
								aria-hidden="true"
							/>
						</div>
						<div>
							<h2
								id={titleId}
								className="text-lg font-semibold text-neutral-900"
							>
								Send funds
							</h2>
							<p className="text-sm text-neutral-500">
								{wallet?.balance
									? `Available: ${wallet.balance}`
									: "No balance available"}
							</p>
						</div>
					</div>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={handleClose}
						aria-label="Close send dialog"
						autoFocus
					>
						<X className="h-4 w-4" aria-hidden="true" />
					</Button>
				</div>

				<form onSubmit={handleSubmit} noValidate>
					<div className="space-y-5 px-6 py-6">
						{/* Destination address */}
						<div className="space-y-1.5">
							<label
								htmlFor={destinationId}
								className="block text-sm font-medium text-neutral-900"
							>
								Destination address
								<span className="ml-1 text-red-500" aria-hidden="true">
									*
								</span>
							</label>
							<input
								id={destinationId}
								type="text"
								value={destination}
								onChange={(e) => setDestination(e.target.value)}
								onBlur={() => handleBlur("destination")}
								placeholder="G…"
								autoComplete="off"
								spellCheck={false}
								aria-required="true"
								aria-invalid={touched.destination && !!errors.destination}
								aria-describedby={
									touched.destination && errors.destination
										? destinationErrorId
										: undefined
								}
								className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 aria-invalid:border-red-500 aria-invalid:ring-red-500/20"
							/>
							{touched.destination && errors.destination && (
								<p
									id={destinationErrorId}
									role="alert"
									className="flex items-center gap-1.5 text-xs text-red-600"
								>
									<AlertCircle
										className="h-3.5 w-3.5 shrink-0"
										aria-hidden="true"
									/>
									{errors.destination}
								</p>
							)}
						</div>

						{/* Amount */}
						<div className="space-y-1.5">
							<label
								htmlFor={amountId}
								className="block text-sm font-medium text-neutral-900"
							>
								Amount (XLM)
								<span className="ml-1 text-red-500" aria-hidden="true">
									*
								</span>
							</label>
							<input
								id={amountId}
								type="number"
								min="0"
								step="any"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								onBlur={() => handleBlur("amount")}
								placeholder="0.00"
								aria-required="true"
								aria-invalid={touched.amount && !!errors.amount}
								aria-describedby={
									touched.amount && errors.amount ? amountErrorId : undefined
								}
								className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 aria-invalid:border-red-500 aria-invalid:ring-red-500/20"
							/>
							{touched.amount && errors.amount && (
								<p
									id={amountErrorId}
									role="alert"
									className="flex items-center gap-1.5 text-xs text-red-600"
								>
									<AlertCircle
										className="h-3.5 w-3.5 shrink-0"
										aria-hidden="true"
									/>
									{errors.amount}
								</p>
							)}
						</div>

						{isOffline && (
							<p
								role="status"
								className="flex items-center gap-1.5 text-sm text-amber-700"
							>
								<WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
								You're offline. Sending is paused until your connection is
								back.
							</p>
						)}

						{submitError && (
							<p
								role="alert"
								className="flex items-center gap-1.5 text-sm text-red-600"
							>
								<AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
								{submitError}
							</p>
						)}
					</div>

					<div className="flex justify-end gap-3 border-t border-neutral-200 px-6 py-4">
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={submitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							aria-label="Submit send transaction"
							disabled={submitting || isOffline}
						>
							<SendHorizonal className="h-4 w-4" aria-hidden="true" />
							{submitting ? "Sending…" : "Send"}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
