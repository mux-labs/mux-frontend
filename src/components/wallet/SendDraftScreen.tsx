"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Wallet } from "@/types/wallet";

interface SendDraftScreenProps {
	wallet: Wallet | null;
	onContinue?: (draft: { destination: string; amount: string }) => void;
}

/**
 * Stub screen for the send flow draft step. Captures destination/amount
 * before handing off to the full SendWalletModal validation flow.
 */
export function SendDraftScreen({ wallet, onContinue }: SendDraftScreenProps) {
	const [destination, setDestination] = useState("");
	const [amount, setAmount] = useState("");

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
			<Button
				type="button"
				onClick={() => onContinue?.({ destination, amount })}
			>
				Continue
			</Button>
		</div>
	);
}
