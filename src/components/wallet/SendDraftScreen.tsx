"use client";

import { useState } from "react";
import type { SendDraftPreview } from "@/app/api/send/draft/route";
import { Button } from "@/components/ui/button";
import { useSendDraft } from "@/hooks/useSendDraft";
import type { Wallet } from "@/types/wallet";

interface SendDraftScreenProps {
	wallet: Wallet | null;
	/**
	 * Demo mode resolves the draft from local mock data instead of the
	 * real (auth-gated) `/api/send/draft` backend. Demo dashboard routes
	 * pass `demo`; production callers must not.
	 */
	demo?: boolean;
	onContinue?: (draft: {
		destination: string;
		amount: string;
		preview: SendDraftPreview;
	}) => void;
}

/**
 * Send-flow draft step. Captures destination/amount, then asks the backend
 * (via `/api/send/draft`, which proxies to `mux-backend`) to validate the
 * draft and return a fee/arrival preview before handing off to the full
 * `SendWalletModal` validation flow.
 *
 * Wiring for issue #616 — there is no silent mock success in production
 * builds; see `src/app/api/send/draft/route.ts`.
 */
export function SendDraftScreen({
	wallet,
	demo = false,
	onContinue,
}: SendDraftScreenProps) {
	const [destination, setDestination] = useState("");
	const [amount, setAmount] = useState("");
	const [localError, setLocalError] = useState<string | null>(null);

	const draft = useSendDraft({
		demo,
		onSuccess: (preview) => {
			onContinue?.({ destination, amount, preview });
		},
	});

	const handleContinue = () => {
		setLocalError(null);

		if (!destination.trim()) {
			setLocalError("Destination address is required.");
			return;
		}
		if (!amount.trim()) {
			setLocalError("Amount is required.");
			return;
		}

		draft.mutate({
			destination: destination.trim(),
			amount: amount.trim(),
			walletId: wallet?.id,
			network: wallet?.network,
		});
	};

	const error = localError ?? draft.error?.message ?? null;
	const preview = draft.data;

	return (
		<div className="space-y-4" data-testid="send-draft-screen">
			<h2 className="text-lg font-semibold">
				Send from {wallet?.name ?? "wallet"}
			</h2>
			<div className="space-y-2">
				<label htmlFor="send-draft-destination" className="text-sm font-medium">
					Destination
				</label>
				<input
					id="send-draft-destination"
					value={destination}
					onChange={(e) => setDestination(e.target.value)}
					className="w-full rounded-md border px-3 py-2 text-sm"
					placeholder="G..."
				/>
			</div>
			<div className="space-y-2">
				<label htmlFor="send-draft-amount" className="text-sm font-medium">
					Amount
				</label>
				<input
					id="send-draft-amount"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
					className="w-full rounded-md border px-3 py-2 text-sm"
					placeholder="0.00"
				/>
			</div>

			{error && (
				<p
					role="alert"
					className="text-sm text-red-600"
					data-testid="send-draft-error"
				>
					{error}
				</p>
			)}

			{preview && (
				<dl
					className="rounded-md border border-neutral-200 p-3 text-sm"
					data-testid="send-draft-preview"
				>
					<div className="flex justify-between">
						<dt className="text-neutral-500">Network fee</dt>
						<dd>{preview.fee} XLM</dd>
					</div>
					<div className="flex justify-between">
						<dt className="text-neutral-500">Estimated arrival</dt>
						<dd>{preview.estimatedArrival}</dd>
					</div>
				</dl>
			)}

			<Button type="button" onClick={handleContinue} disabled={draft.isPending}>
				{draft.isPending ? "Validating…" : "Continue"}
			</Button>
		</div>
	);
}
