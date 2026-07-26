"use client";

import { Check, Copy, Key, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createFocusTrapHandler } from "@/utils/keyboardNavigation";

interface CreatedApiKey {
	name: string;
	value: string;
	key: string;
}

interface APIKeyModalProps {
	isOpen: boolean;
	onClose: () => void;
	onKeyCreated?: (key: CreatedApiKey) => void;
}

function createApiKey(): string {
	return `mux_live_${Math.random().toString(36).slice(2, 15)}${Math.random()
		.toString(36)
		.slice(2, 15)}`;
}

export default function APIKeyModal({
	isOpen,
	onClose,
	onKeyCreated,
}: APIKeyModalProps) {
	const titleId = useId();
	const descriptionId = useId();
	const nameId = useId();
	const errorId = useId();
	const dialogRef = useRef<HTMLDivElement>(null);
	const previousFocusRef = useRef<HTMLElement | null>(null);

	const [keyName, setKeyName] = useState("");
	const [apiKey, setApiKey] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [acknowledged, setAcknowledged] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const isRevealStep = apiKey !== null;

	useEffect(() => {
		if (!isOpen) return;
		previousFocusRef.current = document.activeElement as HTMLElement | null;
		const id = window.setTimeout(() => {
			const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
			);
			firstFocusable?.focus();
		}, 0);

		return () => {
			window.clearTimeout(id);
			previousFocusRef.current?.focus?.();
		};
	}, [isOpen]);

	const reset = () => {
		setKeyName("");
		setApiKey(null);
		setError(null);
		setCopied(false);
		setAcknowledged(false);
		setIsSubmitting(false);
	};

	const handleClose = () => {
		reset();
		onClose();
	};

	const generateApiKey = async () => {
		const trimmedName = keyName.trim();
		if (!trimmedName) {
			setError("Key name is required.");
			return;
		}

		setError(null);
		setIsSubmitting(true);
		await Promise.resolve();

		const newKey = createApiKey();
		setApiKey(newKey);
		setIsSubmitting(false);
		onKeyCreated?.({ name: trimmedName, value: newKey, key: newKey });
	};

	const copyToClipboard = async () => {
		if (!apiKey) return;
		await navigator.clipboard.writeText(apiKey);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 2000);
	};

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
				if (event.key === "Escape") {
					event.preventDefault();
					handleClose();
				}
			}}
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		>
			<div
				className="absolute inset-0"
				aria-hidden="true"
				onClick={handleClose}
			/>

			<div className="relative w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
				<div className="flex items-center justify-between border-b border-zinc-200 p-6 dark:border-zinc-800">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900">
							<Key className="h-5 w-5 text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
						</div>
						<div>
							<h2
								id={titleId}
								className="text-xl font-semibold text-zinc-900 dark:text-zinc-50"
							>
								{isRevealStep ? "Save your API key" : "Create API Key"}
							</h2>
							<p
								id={descriptionId}
								className="text-sm text-zinc-500 dark:text-zinc-400"
							>
								{isRevealStep
									? "This key will only be shown once."
									: "Name the key before generating a secret."}
							</p>
						</div>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={handleClose}
						aria-label="Close dialog"
					>
						<X className="h-4 w-4" aria-hidden="true" />
					</Button>
				</div>

				<div className="space-y-5 p-6">
					{isRevealStep ? (
						<>
							<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
								This key will only be shown once. Copy it now and store it in a
								secure secret manager before closing this dialog.
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
									Generated API key
								</label>
								<div className="flex gap-2">
									<code
										data-testid="generated-key"
										className="min-w-0 flex-1 overflow-x-auto rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
									>
										{apiKey}
									</code>
									<Button
										type="button"
										variant="outline"
										onClick={copyToClipboard}
										data-testid="copy-generated-key"
										aria-label={copied ? "API key copied" : "Copy API key"}
									>
										{copied ? (
											<Check className="h-4 w-4 text-green-600" aria-hidden="true" />
										) : (
											<Copy className="h-4 w-4" aria-hidden="true" />
										)}
										{copied ? "Copied" : "Copy"}
									</Button>
								</div>
								{copied && (
									<p role="status" className="mt-2 text-sm text-green-700 dark:text-green-400">
										API key copied to clipboard
									</p>
								)}
							</div>

							<label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
								<input
									type="checkbox"
									checked={acknowledged}
									onChange={(event) => setAcknowledged(event.target.checked)}
									data-testid="acknowledge-checkbox"
									className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
								/>
								I have copied this key and understand it cannot be viewed again.
							</label>
						</>
					) : (
						<>
							<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
								Save your API key after it is generated. It will only be
								displayed once.
							</div>
							<div>
								<label
									htmlFor={nameId}
									className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
								>
									Key name
								</label>
								<input
									id={nameId}
									type="text"
									value={keyName}
									onChange={(event) => {
										setKeyName(event.target.value);
										if (error) setError(null);
									}}
									aria-invalid={!!error}
									aria-describedby={error ? errorId : undefined}
									className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
									placeholder="Production backend"
								/>
								{error && (
									<p id={errorId} role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
										{error}
									</p>
								)}
							</div>
						</>
					)}
				</div>

				<div className="flex justify-end gap-3 border-t border-zinc-200 p-6 dark:border-zinc-800">
					<Button type="button" variant="outline" onClick={handleClose}>
						{isRevealStep ? "Close" : "Cancel"}
					</Button>
					{isRevealStep ? (
						<Button
							type="button"
							onClick={handleClose}
							disabled={!acknowledged}
							data-testid="done-btn"
						>
							Done
						</Button>
					) : (
						<Button
							type="button"
							onClick={() => void generateApiKey()}
							disabled={isSubmitting}
							data-testid="generate-key-btn"
						>
							{isSubmitting ? "Generating…" : "Generate Key"}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
