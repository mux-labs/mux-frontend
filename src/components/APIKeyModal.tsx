"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/CopyButton";
// Import from the canonical types module, not from mock-data (#708).
import type { CreatedApiKey } from "@/types/api-key";

interface APIKeyModalProps {
	isOpen: boolean;
	onClose: () => void;
	/**
	 * Called when the user clicks "Generate Key".
	 *
	 * In production this must be wired to the backend create endpoint.
	 * The modal has NO local fallback secret generator — secrets are always
	 * issued by the backend and displayed exactly once (#708).
	 *
	 * In demo / Storybook contexts pass a mock implementation that returns a
	 * fake CreatedApiKey.  When omitted entirely the modal will surface an
	 * error message asking the developer to wire the prop.
	 */
	onCreateKey?: (name: string) => Promise<CreatedApiKey>;
	/** Called after a key is successfully created, e.g. to refresh the table. */
	onKeyCreated?: (key: CreatedApiKey) => void;
}

export default function APIKeyModal({
	isOpen,
	onClose,
	onCreateKey,
	onKeyCreated,
}: APIKeyModalProps) {
	const [name, setName] = useState("");
	const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	/**
	 * The user must check this box before "Done" is enabled.  Enforcing this
	 * client-side mirrors the backend's create-once semantics: the secret is
	 * shown once, the user acknowledges it, and the modal is dismissed (#708).
	 */
	const [acknowledged, setAcknowledged] = useState(false);

	const handleCreate = async () => {
		const trimmedName = name.trim();
		if (!trimmedName) {
			setError("Key name is required. Please enter a name for this API key.");
			return;
		}

		if (!onCreateKey) {
			// Guard: this modal must be wired to a real (or demo) key-creation
			// function.  A missing prop is a developer integration error, not a
			// runtime user error — surface it clearly rather than silently
			// generating a fake secret (#708).
			setError(
				"API key creation is not configured. Please wire the onCreateKey prop to your key creation handler.",
			);
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			const key = await onCreateKey(trimmedName);
			setCreatedKey(key);
			onKeyCreated?.(key);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to create API key.",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		setName("");
		setCreatedKey(null);
		setIsSubmitting(false);
		setError(null);
		setAcknowledged(false);
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="create-api-key-title"
				className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-md w-full"
			>
				{/* Header */}
				<div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-6 dark:border-zinc-800">
					<h2
						id="create-api-key-title"
						className="text-2xl font-bold text-zinc-900 dark:text-zinc-50"
					>
						{createdKey ? "Save your API key" : "Create API Key"}
					</h2>
					<button
						type="button"
						onClick={handleClose}
						aria-label="Close dialog"
						className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Body */}
				<div className="p-6 space-y-6">
					{createdKey ? (
						/* ── Secret reveal step (#708) ── */
						<div className="space-y-4">
							<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
								<div className="flex gap-3">
									<span
										className="text-amber-600 dark:text-amber-500 text-xl leading-none mt-0.5"
										aria-hidden="true"
									>
										⚠️
									</span>
									<div>
										<h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
											Copy this secret now
										</h3>
										<p className="text-sm text-amber-800 dark:text-amber-300">
											This key will only be displayed once. Store it somewhere
											safe — you won't be able to see it again after closing
											this dialog.
										</p>
									</div>
								</div>
							</div>

							<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
								<p className="text-sm font-medium text-green-900 dark:text-green-200">
									✓ API Key successfully created
								</p>
							</div>

							<div>
								<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
									Your API secret
								</label>
								<div className="flex gap-2">
									<div
										data-testid="generated-key"
										className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded px-3 py-2 font-mono text-sm text-zinc-900 dark:text-zinc-50 overflow-x-auto"
									>
										{createdKey.secret}
									</div>
									<CopyButton
										text={createdKey.secret}
										type="key"
										successMessage="API key copied to clipboard"
										data-testid="copy-generated-key"
									/>
								</div>
							</div>

							<label className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
								<input
									type="checkbox"
									checked={acknowledged}
									onChange={(event) => setAcknowledged(event.target.checked)}
									data-testid="acknowledge-checkbox"
									className="mt-1"
								/>
								<span>
									I have copied and stored this secret. It will not be shown
									again after closing this modal.
								</span>
							</label>
						</div>
					) : (
						/* ── Name input step ── */
						<div className="space-y-4">
							<p className="text-zinc-600 dark:text-zinc-400">
								Name this key so you can identify it later. The full secret is
								shown only once after creation.
							</p>
							<div>
								<label
									htmlFor="api-key-name"
									className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
								>
									Key name
								</label>
								<input
									id="api-key-name"
									value={name}
									onChange={(event) => setName(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === "Enter") {
											void handleCreate();
										}
									}}
									placeholder="Production server"
									className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-100"
								/>
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
					)}
				</div>

				{/* Footer */}
				<div className="border-t border-zinc-200 dark:border-zinc-800 p-6 flex gap-3 justify-end">
					{createdKey ? (
						<Button
							onClick={handleClose}
							disabled={!acknowledged}
							data-testid="done-btn"
						>
							Done
						</Button>
					) : (
						<>
							<Button variant="outline" onClick={handleClose}>
								Cancel
							</Button>
							<Button
								onClick={handleCreate}
								disabled={isSubmitting}
								data-testid="generate-key-btn"
							>
								{isSubmitting ? "Creating…" : "Generate Key"}
							</Button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
