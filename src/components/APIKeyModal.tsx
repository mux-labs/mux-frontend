"use client";

import { AlertCircle, CheckCircle2, Copy, Loader2, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { validateApiKeyName } from "@/utils/formValidation";

interface APIKeyModalProps {
	isOpen: boolean;
	onClose: () => void;
	onKeyCreated?: (key: { name: string; value: string }) => void;
}

type Step = "form" | "generating" | "success";

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

export default function APIKeyModal({
	isOpen,
	onClose,
	onKeyCreated,
}: APIKeyModalProps) {
	const keyNameId = useId();

	const [step, setStep] = useState<Step>("form");
	const [keyName, setKeyName] = useState("");
	const [keyNameError, setKeyNameError] = useState<string | undefined>();
	const [apiKey, setApiKey] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	function resetForm() {
		setStep("form");
		setKeyName("");
		setKeyNameError(undefined);
		setApiKey(null);
		setCopied(false);
	}

	function handleClose() {
		resetForm();
		onClose();
	}

	function handleKeyNameChange(value: string) {
		setKeyName(value);
		if (keyNameError) setKeyNameError(undefined);
	}

	function handleKeyNameBlur() {
		if (!keyName.trim()) return;
		const { valid, error } = validateApiKeyName(keyName);
		if (!valid) {
			setKeyNameError(error);
		}
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		// Validate key name
		const validation = validateApiKeyName(keyName);
		if (!validation.valid) {
			setKeyNameError(validation.error);
			return;
		}

		setStep("generating");

		// Simulate API call
		await new Promise((resolve) => setTimeout(resolve, 800));

		// Generate mock API key
		const newKey = `mux_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

		setApiKey(newKey);
		setStep("success");
		onKeyCreated?.({ name: keyName.trim(), value: newKey });
	}

	async function copyToClipboard() {
		if (apiKey) {
			await navigator.clipboard.writeText(apiKey);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	}

	if (!isOpen) return null;

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="create-api-key-title"
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
		>
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={handleClose}
				aria-hidden="true"
			/>

			{/* Modal */}
			<div className="relative w-full max-w-md rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
				{/* Header */}
				<div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
					<div className="flex items-center justify-between">
						<h2
							id="create-api-key-title"
							className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
						>
							Create API Key
						</h2>
						<button
							onClick={handleClose}
							className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
							aria-label="Close dialog"
						>
							<X className="h-5 w-5" />
						</button>
					</div>
				</div>

				{/* Content */}
				<div className="space-y-6 p-6">
					{step === "form" && (
						<>
							{/* Warning */}
							<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
								<div className="flex gap-3">
									<div className="text-xl leading-none text-amber-600 dark:text-amber-500">
										⚠️
									</div>
									<div>
										<h3 className="mb-1 font-semibold text-amber-900 dark:text-amber-200">
											Save your API key
										</h3>
										<p className="text-sm text-amber-800 dark:text-amber-300">
											This key will only be displayed once. Store it somewhere
											safe as you won't be able to see it again.
										</p>
									</div>
								</div>
							</div>

							{/* Form */}
							<form onSubmit={handleSubmit} className="space-y-4">
								<div>
									<label
										htmlFor={keyNameId}
										className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
									>
										Key Name
									</label>
									<input
										id={keyNameId}
										type="text"
										value={keyName}
										onChange={(e) => handleKeyNameChange(e.target.value)}
										onBlur={handleKeyNameBlur}
										placeholder="e.g., Production API Key"
										className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500"
										required
										maxLength={50}
										disabled={step !== "form"}
									/>
									{keyNameError && <FieldError message={keyNameError} />}
									<p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
										{keyName.length}/50 characters
									</p>
								</div>

								<Button
									type="submit"
									disabled={step !== "form"}
									className="w-full"
								>
									{step === "generating" && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									{step === "generating"
										? "Generating..."
										: "Generate Key"}
								</Button>
							</form>
						</>
					)}

					{step === "success" && apiKey && (
						<>
							{/* Success Message */}
							<div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
								<div className="flex items-center gap-2">
									<CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
									<p className="text-sm font-medium text-green-900 dark:text-green-200">
										API Key successfully created
									</p>
								</div>
							</div>

							{/* Key Display */}
							<div className="space-y-2">
								<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
									Your API Key
								</label>
								<div className="flex gap-2">
									<div className="flex-1 overflow-x-auto rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50">
										{apiKey}
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={copyToClipboard}
										className={
											copied
												? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
												: ""
										}
									>
										<Copy className="h-4 w-4" />
										{copied ? "Copied" : "Copy"}
									</Button>
								</div>
							</div>
						</>
					)}
				</div>

				{/* Footer */}
				<div className="border-t border-zinc-200 flex gap-3 px-6 py-4 dark:border-zinc-800">
					<Button
						type="button"
						variant="outline"
						className="flex-1"
						onClick={handleClose}
					>
						Close
					</Button>
				</div>
			</div>
		</div>
	);
}
