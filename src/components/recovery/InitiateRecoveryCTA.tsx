"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/utils/copyToClipboard";
import { type UseRecoveryReturn } from "@/hooks/useRecovery";

/**
 * Props for the {@link InitiateRecoveryCTA} component.
 */
interface InitiateRecoveryCTAProps {
	/**
	 * The full return value of the {@link useRecovery} hook.
	 *
	 * The component reads `state` and `errorMessage` to decide which UI to
	 * render, and wires the callback functions (`initiateRecovery`,
	 * `confirmRecovery`, `cancelRecovery`, `resetRecovery`) to the relevant
	 * buttons so that state transitions happen without any additional wiring in
	 * the parent.
	 */
	recovery: UseRecoveryReturn;
}

/**
 * Call-to-action card that drives the wallet recovery state machine.
 *
 * Renders a different UI for each phase of the recovery flow:
 *
 * | `recovery.state` | Rendered UI                                              |
 * |------------------|----------------------------------------------------------|
 * | `"idle"`         | Primary "Initiate recovery" button                       |
 * | `"error"`        | Same as idle but with an inline error alert above button |
 * | `"confirming"`   | Amber confirmation panel with confirm / cancel buttons   |
 * | `"pending"`      | Spinner with "Submitting recovery request…" message      |
 * | `"success"`      | Green success banner with a "Dismiss" button             |
 *
 * All state transitions are delegated to the `recovery` prop so this component
 * remains a pure presentation layer.
 *
 * @example
 * function Page() {
 *   const recovery = useRecovery();
 *   return <InitiateRecoveryCTA recovery={recovery} />;
 * }
 */
export function InitiateRecoveryCTA({ recovery }: InitiateRecoveryCTAProps) {
	const {
		state,
		errorMessage,
		recoveryRequestId,
		initiateRecovery,
		confirmRecovery,
		cancelRecovery,
		resetRecovery,
	} = recovery;

	const [copiedId, setCopiedId] = useState(false);

	const handleCopyId = useCallback(async () => {
		if (!recoveryRequestId) return;
		try {
			await copyToClipboard(recoveryRequestId);
			setCopiedId(true);
			setTimeout(() => setCopiedId(false), 2000);
		} catch {
			// Silently fail — the toast on the parent page already handles errors
		}
	}, [recoveryRequestId]);

	if (state === "success") {
		return (
			<div
				role="status"
				aria-live="polite"
				className="rounded-xl border border-green-200 bg-green-50 p-6 flex items-start gap-4 dark:bg-green-900/10 dark:border-green-800"
			>
				<div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full text-green-600 dark:text-green-400 shrink-0">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={2}
						stroke="currentColor"
						className="w-5 h-5"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M4.5 12.75l6 6 9-13.5"
						/>
					</svg>
				</div>
				<div className="flex-1 space-y-3">
					<div>
						<h3 className="font-semibold text-green-900 dark:text-green-200">
							Recovery initiated
						</h3>
						<p className="text-sm text-green-800 dark:text-green-300 mt-1">
							Your recovery request has been submitted. This process may take up
							to 24 hours. You will be notified once it completes.
						</p>
					</div>

					{recoveryRequestId && (
						<div className="flex items-center gap-2 rounded-lg border border-green-300 dark:border-green-700 bg-green-100/50 dark:bg-green-900/20 px-3 py-2">
							<code
								className="text-sm font-mono text-green-900 dark:text-green-200 select-all"
								data-testid="recovery-request-id"
							>
								{recoveryRequestId}
							</code>
							<button
								type="button"
								onClick={handleCopyId}
								aria-label={
									copiedId ? "Recovery ID copied" : "Copy recovery request ID"
								}
								className="shrink-0 p-1 rounded-md text-green-600 hover:text-green-800 hover:bg-green-200 dark:text-green-400 dark:hover:text-green-200 dark:hover:bg-green-800/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
							>
								{copiedId ? (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth={2}
										stroke="currentColor"
										className="w-4 h-4"
										aria-hidden="true"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M4.5 12.75l6 6 9-13.5"
										/>
									</svg>
								) : (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth={2}
										stroke="currentColor"
										className="w-4 h-4"
										aria-hidden="true"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
										/>
									</svg>
								)}
							</button>
						</div>
					)}

					<Button
						variant="ghost"
						size="sm"
						className="text-green-700 hover:text-green-900 dark:text-green-400 dark:hover:text-green-200"
						onClick={resetRecovery}
					>
						Dismiss
					</Button>
				</div>
			</div>
		);
	}

	if (state === "confirming") {
		return (
			<div
				role="dialog"
				aria-modal="false"
				aria-labelledby="recovery-confirm-title"
				className="rounded-xl border border-amber-200 bg-amber-50 p-6 space-y-4 dark:bg-amber-900/10 dark:border-amber-800"
			>
				<div>
					<h3
						id="recovery-confirm-title"
						className="font-semibold text-amber-900 dark:text-amber-200"
					>
						Confirm recovery initiation
					</h3>
					<p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
						This will start the wallet recovery process. Recovery operations are
						secure and your private keys will never be exposed. Are you sure you
						want to proceed?
					</p>
				</div>
				<div className="flex gap-3">
					<Button
						onClick={confirmRecovery}
						size="sm"
						className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600"
					>
						Yes, initiate recovery
					</Button>
					<Button variant="outline" size="sm" onClick={cancelRecovery}>
						Cancel
					</Button>
				</div>
			</div>
		);
	}

	if (state === "pending") {
		return (
			<div
				role="status"
				aria-live="polite"
				className="rounded-xl border border-zinc-200 bg-white p-6 flex items-center gap-4 dark:border-zinc-800 dark:bg-zinc-950"
			>
				<svg
					className="w-5 h-5 animate-spin text-zinc-500 shrink-0"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<circle
						className="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						strokeWidth="4"
					/>
					<path
						className="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
					/>
				</svg>
				<p className="text-sm text-zinc-600 dark:text-zinc-400">
					Submitting recovery request&hellip;
				</p>
			</div>
		);
	}

	// idle or error state — show the primary CTA
	return (
		<div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4 dark:border-zinc-800 dark:bg-zinc-950">
			<div>
				<h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
					Initiate manual recovery
				</h3>
				<p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
					If you believe your wallet requires immediate attention, you can
					manually trigger the recovery process.
				</p>
			</div>

			{state === "error" && errorMessage && (
				<div
					role="alert"
					className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
				>
					{errorMessage}
				</div>
			)}

			<Button onClick={initiateRecovery} disabled={state === "loading"}>
				Initiate recovery
			</Button>
		</div>
	);
}
