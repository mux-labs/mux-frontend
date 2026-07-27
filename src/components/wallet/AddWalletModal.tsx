"use client";

import {
	AlertCircle,
	Check,
	CheckCircle2,
	Copy,
	Loader2,
	Plus,
	X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { TestnetHint } from "@/components/ui/TestnetHint";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import type { Wallet, WalletNetwork } from "@/types/wallet";
import {
	truncateAddress,
	validateStellarAddress,
} from "@/utils/addressFormatting";
import { hasValidStellarChecksum } from "@/utils/addressValidation";
import { createFocusTrapHandler } from "@/utils/keyboardNavigation";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Props for the `AddWalletModal` dialog. */
export interface AddWalletModalProps {
	/** Controls visibility of the modal. When `false` nothing is rendered. */
	isOpen: boolean;
	/** Called when the user dismisses the modal (Cancel, ✕ button, backdrop, or Escape). */
	onClose: () => void;
	/**
	 * Called with the newly created `Wallet` object immediately after the user
	 * completes the form and the simulated persistence resolves.
	 */
	onAdd: (wallet: Wallet) => void;
	existingAddresses?: string[];
}

type Step = "form" | "submitting" | "success";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
	return `wallet-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function validateLabel(value: string): { valid: boolean; error?: string } {
	const trimmed = value.trim();
	if (!trimmed) return { valid: true };
	if (trimmed.length > 30) {
		return { valid: false, error: "Label must be 30 characters or less." };
	}
	if (/[<>"'&]/.test(trimmed)) {
		return { valid: false, error: "Label contains invalid characters." };
	}
	return { valid: true };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldError({ message }: { message: string }) {
	return (
		<p
			role="alert"
			className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400"
		>
			<AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
			{message}
		</p>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AddWalletModal({
	isOpen,
	onClose,
	onAdd,
	existingAddresses,
}: AddWalletModalProps) {
	const addressId = useId();
	const networkId = useId();
	const labelId = useId();

	const [step, setStep] = useState<Step>("form");
	const [address, setAddress] = useState("");
	const [network, setNetwork] = useState<WalletNetwork>("mainnet");
	const [label, setLabel] = useState("");
	const [addressError, setAddressError] = useState<string | undefined>();
	const [labelError, setLabelError] = useState<string | undefined>();
	const [addedWallet, setAddedWallet] = useState<Wallet | null>(null);
	const { copy, copied, error: copyError } = useCopyToClipboard();

	const addressInputRef = useRef<HTMLInputElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const dialogRef = useRef<HTMLDivElement>(null);

	// Focus address input when modal opens
	useEffect(() => {
		if (isOpen && step === "form") {
			const id = setTimeout(() => addressInputRef.current?.focus(), 50);
			return () => clearTimeout(id);
		}
	}, [isOpen, step]);

	// Trap focus and handle Escape key
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") handleClose();
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

	function resetForm() {
		setStep("form");
		setAddress("");
		setNetwork("mainnet");
		setLabel("");
		setAddressError(undefined);
		setLabelError(undefined);
		setAddedWallet(null);
	}

	function handleClose() {
		resetForm();
		onClose();
	}

	function handleAddressChange(value: string) {
		setAddress(value);
		if (addressError) setAddressError(undefined);
	}

	function handleLabelChange(value: string) {
		setLabel(value);
		if (labelError) setLabelError(undefined);
	}

	function isDuplicateAddress(addr: string): boolean {
		const trimmed = addr.trim();
		return !!existingAddresses?.some((a) => a.trim() === trimmed);
	}

	function handleAddressBlur() {
		if (!address.trim()) return;
		const { valid, error } = validateStellarAddress(address);
		if (!valid) {
			setAddressError(error);
			return;
		}
		if (isDuplicateAddress(address)) {
			setAddressError("This address has already been added.");
		}
	}

	function handleLabelBlur() {
		const { valid, error } = validateLabel(label);
		if (!valid) setLabelError(error);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		const addrResult = validateStellarAddress(address);
		if (!addrResult.valid) {
			setAddressError(addrResult.error);
			addressInputRef.current?.focus();
			return;
		}

		if (isDuplicateAddress(address)) {
			setAddressError("This address has already been added.");
			addressInputRef.current?.focus();
			return;
		}

		const lblResult = validateLabel(label);
		if (!lblResult.valid) {
			setLabelError(lblResult.error);
			return;
		}

		setStep("submitting");

		// Simulate async persistence (replace with real API call)
		await new Promise((resolve) => setTimeout(resolve, 800));

		const trimmedLabel = label.trim();
		const newWallet: Wallet = {
			id: generateId(),
			address: address.trim(),
			label: trimmedLabel || undefined,
			network,
			status: "pending",
			createdAt: new Date(),
		};

		setAddedWallet(newWallet);
		setStep("success");
		onAdd(newWallet);
	}

	if (!isOpen) return null;

	const charCount = address.trim().length;
	const checksumState =
		charCount === 56
			? hasValidStellarChecksum(address)
				? "valid"
				: "invalid"
			: "pending";

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="add-wallet-title"
			ref={dialogRef}
			onKeyDown={(event) => {
				createFocusTrapHandler(dialogRef)(event);
			}}
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
		>
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={handleClose}
				aria-hidden="true"
			/>

			{/* Panel */}
			<div className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
							<Plus
								className="h-4 w-4 text-zinc-600 dark:text-zinc-400"
								aria-hidden="true"
							/>
						</div>
						<h2
							id="add-wallet-title"
							className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
						>
							Add Wallet
						</h2>
					</div>
					<Button
						ref={closeButtonRef}
						variant="ghost"
						size="icon-sm"
						onClick={handleClose}
						aria-label="Close dialog"
					>
						<X className="h-4 w-4" aria-hidden="true" />
					</Button>
				</div>

				{/* Body */}
				<div className="px-6 py-5">
					{step === "form" && (
						<form id="add-wallet-form" onSubmit={handleSubmit} noValidate>
							<div className="space-y-5">
								{/* Address field */}
								<div>
									<label
										htmlFor={addressId}
										className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
									>
										Stellar Address
									</label>
									<input
										ref={addressInputRef}
										id={addressId}
										type="text"
										value={address}
										onChange={(e) => handleAddressChange(e.target.value)}
										onBlur={handleAddressBlur}
										placeholder="GABC...XYZ"
										autoComplete="off"
										spellCheck={false}
										aria-describedby={
											addressError
												? `${addressId}-error ${addressId}-checksum`
												: `${addressId}-checksum`
										}
										aria-invalid={!!addressError}
										className={`
											w-full rounded-lg border px-3 py-2 font-mono text-sm
											text-zinc-900 placeholder-zinc-400 outline-none
											transition-colors
											dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500
											focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-50/20
											${
												addressError
													? "border-red-400 focus:border-red-400 dark:border-red-500"
													: "border-zinc-300 focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-500"
											}
										`}
									/>
									{addressError && (
										<span id={`${addressId}-error`}>
											<FieldError message={addressError} />
										</span>
									)}
									<div className="mt-1.5 flex items-center justify-between">
										<p
											id={`${addressId}-checksum`}
											aria-live="polite"
											className={`text-xs ${
												checksumState === "valid"
													? "text-green-700 dark:text-green-400"
													: checksumState === "invalid"
														? "text-red-600 dark:text-red-400"
														: "text-zinc-500 dark:text-zinc-400"
											}`}
										>
											{checksumState === "valid"
												? "Checksum verified — this is a valid Stellar account."
												: checksumState === "invalid"
													? "Checksum does not match. Check the final characters."
													: "56-character Stellar public key starting with G; checksum is verified locally."}
										</p>
										{charCount > 0 && (
											<span
												data-testid="char-count"
												className={`text-xs font-mono ${
													charCount === 56
														? "text-green-600 dark:text-green-400"
														: "text-zinc-400 dark:text-zinc-500"
												}`}
											>
												{charCount}/56
											</span>
										)}
									</div>
								</div>

								{/* Network field */}
								<div>
									<label
										htmlFor={networkId}
										className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
									>
										Network
									</label>
									<select
										id={networkId}
										value={network}
										onChange={(e) =>
											setNetwork(e.target.value as WalletNetwork)
										}
										className="
											w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm
											text-zinc-900 outline-none transition-colors
											focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/20
											dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50
											dark:focus:border-zinc-500 dark:focus:ring-zinc-50/20
										"
									>
										<option value="mainnet">Mainnet</option>
										<option value="testnet">Testnet</option>
									</select>
								</div>

								{/* Label field (optional) */}
								<div>
									<label
										htmlFor={labelId}
										className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
									>
										Label{" "}
										<span className="font-normal text-zinc-400 dark:text-zinc-500">
											(optional)
										</span>
									</label>
									<input
										id={labelId}
										type="text"
										value={label}
										onChange={(e) => handleLabelChange(e.target.value)}
										onBlur={handleLabelBlur}
										placeholder="e.g. Main wallet"
										autoComplete="off"
										aria-describedby={
											labelError ? `${labelId}-error` : undefined
										}
										aria-invalid={!!labelError}
										className={`
											w-full rounded-lg border px-3 py-2 text-sm
											text-zinc-900 placeholder-zinc-400 outline-none
											transition-colors
											dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500
											focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-50/20
											${
												labelError
													? "border-red-400 focus:border-red-400 dark:border-red-500"
													: "border-zinc-300 focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-500"
											}
										`}
									/>
									{labelError ? (
										<span id={`${labelId}-error`}>
											<FieldError message={labelError} />
										</span>
									) : (
										<p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
											A friendly name to identify this wallet. Max 30
											characters.
										</p>
									)}
								</div>
							</div>
						</form>
					)}

					{step === "submitting" && (
						<div className="flex flex-col items-center gap-3 py-6 text-center">
							<Loader2
								className="h-8 w-8 animate-spin text-zinc-500"
								aria-hidden="true"
							/>
							<p className="text-sm text-zinc-500 dark:text-zinc-400">
								Adding wallet…
							</p>
						</div>
					)}

					{step === "success" && addedWallet && (
						<div className="space-y-4">
							<div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
								<CheckCircle2
									className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400"
									aria-hidden="true"
								/>
								<div>
									<p className="text-sm font-medium text-green-900 dark:text-green-200">
										Wallet added successfully
									</p>
									<p className="mt-0.5 text-xs text-green-700 dark:text-green-400">
										It will appear as <strong>Pending</strong> until confirmed
										on-chain.
									</p>
								</div>
							</div>

							{addedWallet.network === "testnet" && (
								<TestnetHint
									variant="compact"
									dismissible={false}
									address={addedWallet.address}
								/>
							)}

							<div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
								<dl className="space-y-2 text-sm">
									{addedWallet.label && (
										<div className="flex justify-between gap-4">
											<dt className="text-zinc-500 dark:text-zinc-400">
												Label
											</dt>
											<dd className="truncate text-zinc-900 dark:text-zinc-50">
												{addedWallet.label}
											</dd>
										</div>
									)}
									<div className="flex items-center justify-between gap-4">
										<dt className="text-zinc-500 dark:text-zinc-400">
											Address
										</dt>
										<dd className="flex items-center gap-1 font-mono text-zinc-900 dark:text-zinc-50">
											<span className="truncate">
												{truncateAddress(addedWallet.address)}
											</span>
											<Button
												variant="ghost"
												size="icon-sm"
												onClick={() =>
													copy(addedWallet.address, addedWallet.address)
												}
												disabled={!!copyError}
												aria-label={
													copyError
														? copyError
														: copied
															? "Address copied"
															: "Copy wallet address"
												}
												title={
													copyError ? copyError : copied ? "Copied!" : "Copy address"
												}
											>
												{copyError ? (
													<AlertCircle
														className="h-4 w-4 text-red-500"
														aria-hidden="true"
													/>
												) : copied ? (
													<Check
														className="h-4 w-4 text-green-500"
														aria-hidden="true"
													/>
												) : (
													<Copy className="h-4 w-4" aria-hidden="true" />
												)}
											</Button>
										</dd>
									</div>
									<div className="flex justify-between gap-4">
										<dt className="text-zinc-500 dark:text-zinc-400">
											Network
										</dt>
										<dd className="capitalize text-zinc-900 dark:text-zinc-50">
											{addedWallet.network}
										</dd>
									</div>
									<div className="flex justify-between gap-4">
										<dt className="text-zinc-500 dark:text-zinc-400">Status</dt>
										<dd className="text-zinc-900 dark:text-zinc-50">Pending</dd>
									</div>
								</dl>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex justify-end gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
					{step === "form" && (
						<>
							<Button variant="outline" onClick={handleClose} type="button">
								Cancel
							</Button>
							<Button form="add-wallet-form" type="submit">
								Add Wallet
							</Button>
						</>
					)}

					{step === "submitting" && (
						<Button disabled>
							<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
							Adding…
						</Button>
					)}

					{step === "success" && (
						<>
							<Button
								variant="outline"
								onClick={() => {
									resetForm();
								}}
							>
								Add Another
							</Button>
							<Button onClick={handleClose}>Done</Button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
