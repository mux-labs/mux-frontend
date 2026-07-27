"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/CopyButton";
import type { CreatedApiKey } from "@/mock-data/api-keys";

interface APIKeyModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCreateKey?: (name: string) => Promise<CreatedApiKey>;
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
	const [acknowledged, setAcknowledged] = useState(false);

	const fallbackCreateKey = async (keyName: string): Promise<CreatedApiKey> => {
		const secret = `mux_live_${Math.random().toString(36).slice(2)}${Math.random()
			.toString(36)
			.slice(2)}`;
		return {
			id: `key-${Date.now()}`,
			name: keyName,
			key: `${secret.slice(0, 8)}••••${secret.slice(-4)}`,
			secret,
			status: "Active",
			createdAt: new Date().toISOString(),
		};
	};

	const handleCreate = async () => {
		const trimmedName = name.trim();
		if (!trimmedName) {
			setError("Key name is required. Please enter a name for this API key.");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			const key = await (onCreateKey ?? fallbackCreateKey)(trimmedName);
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

				<div className="p-6 space-y-6">
					{!createdKey && (
						<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
							<div className="flex gap-3">
								<div className="text-amber-600 dark:text-amber-500 text-xl leading-none mt-0.5">
									⚠️
								</div>
								<div>
									<h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
										Save your API key
									</h3>
									<p className="text-sm text-amber-800 dark:text-amber-300">
										This key will only be displayed once. Make sure to copy and
										store it somewhere safe. You won't be able to see it again.
									</p>
								</div>
							</div>
						</div>
					)}

					{createdKey ? (
						<div className="space-y-4">
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
								Close
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
