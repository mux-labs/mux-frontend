"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * API key reveal-once UX.
 *
 * Shows a newly created API key exactly once. The secret is kept only in
 * component state, is masked until the user explicitly reveals it, and is
 * wiped from memory once the user acknowledges it has been saved or the
 * component unmounts. It is never logged or persisted.
 */

interface ApiKeyRevealOnceProps {
	/** Raw secret returned by the create-key response. */
	secret: string;
	/** Called after the user confirms they have stored the key. */
	onAcknowledge: () => void;
}

export function maskApiKey(secret: string): string {
	if (secret.length <= 8) return "•".repeat(secret.length);
	return `${secret.slice(0, 4)}${"•".repeat(secret.length - 8)}${secret.slice(-4)}`;
}

export function ApiKeyRevealOnce({
	secret,
	onAcknowledge,
}: ApiKeyRevealOnceProps) {
	const [value, setValue] = useState<string | null>(secret);
	const [revealed, setRevealed] = useState(false);
	const [copied, setCopied] = useState(false);

	useEffect(() => () => setValue(null), []);

	const copy = useCallback(async () => {
		if (!value) return;
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
		} catch {
			setCopied(false);
		}
	}, [value]);

	const acknowledge = useCallback(() => {
		setValue(null);
		setRevealed(false);
		onAcknowledge();
	}, [onAcknowledge]);

	if (!value) {
		return (
			<p role="status" data-testid="api-key-hidden">
				This API key can no longer be displayed. Create a new key if it was
				lost.
			</p>
		);
	}

	return (
		<section
			aria-labelledby="api-key-reveal-title"
			data-testid="api-key-reveal-once"
		>
			<h3 id="api-key-reveal-title">Save your API key</h3>
			<p role="alert">
				This key is shown only once. Store it securely before continuing.
			</p>
			<code data-testid="api-key-value" aria-live="polite">
				{revealed ? value : maskApiKey(value)}
			</code>
			<div>
				<button
					type="button"
					onClick={() => setRevealed((r) => !r)}
					aria-pressed={revealed}
				>
					{revealed ? "Hide" : "Reveal"}
				</button>
				<button type="button" onClick={copy}>
					{copied ? "Copied" : "Copy"}
				</button>
				<button type="button" onClick={acknowledge}>
					I have saved this key
				</button>
			</div>
		</section>
	);
}
