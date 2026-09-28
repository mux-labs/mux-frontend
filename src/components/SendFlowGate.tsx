"use client";

import type { ReactNode } from "react";
import {
	evaluateSendFlowGate,
	readClientSendFlowFlags,
	type SendFlowFlags,
	type SendGateCode,
} from "@/lib/feature-flags/send-flows";

interface SendFlowGateProps {
	children: ReactNode;
	/** Defaults to the build-time `NEXT_PUBLIC_*` send flags. */
	flags?: SendFlowFlags;
	/**
	 * Network of the wallet being sent from. Omit to skip the network match;
	 * `null` (unknown network) fails closed.
	 */
	network?: string | null;
}

const DISABLED_COPY: Record<Exclude<SendGateCode, "SEND_OK">, string> = {
	SEND_DISABLED: "Sending isn't available for this project yet.",
	SEND_KILL_SWITCH_ENGAGED:
		"Sending is temporarily paused. Your funds are safe; please try again later.",
	SEND_NETWORK_MISCONFIGURED:
		"Sending is unavailable because the network isn't configured.",
	SEND_MAINNET_NOT_ENABLED: "Sending on mainnet isn't enabled yet.",
	SEND_NETWORK_MISMATCH:
		"This wallet is on a different network than the one sending is enabled for.",
};

/**
 * Feature-flagged send flows (issue #803). Renders the send UI only when the
 * client flags allow it. This is presentation only: `/api/transactions/send`
 * re-evaluates the server-side flags on every request, so bypassing this
 * component cannot bypass the gate.
 */
export function SendFlowGate({ children, flags, network }: SendFlowGateProps) {
	const gate = evaluateSendFlowGate(
		flags ?? readClientSendFlowFlags(),
		network,
	);

	if (gate.allowed) return <>{children}</>;

	return (
		<div
			role="status"
			data-testid="send-flow-disabled"
			data-code={gate.code}
			className="rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900"
		>
			{DISABLED_COPY[gate.code]}
		</div>
	);
}
