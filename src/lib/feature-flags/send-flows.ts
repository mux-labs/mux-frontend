import { configuredNetwork } from "@/lib/http/backend-url";

/**
 * Feature-flagged send flows (issue #803).
 *
 * Send is a money path, so it is deny-by-default and guarded by three
 * independent switches plus the configured network:
 *
 *  - `*_SEND_FLOWS_ENABLED`   opt-in; only "true"/"1" enables.
 *  - `*_SEND_KILL_SWITCH`     overrides everything. Unset/"false"/"0" is off;
 *                             any other value (including typos) engages it.
 *  - `*_SEND_MAINNET_ENABLED` second opt-in required before mainnet sends.
 *  - network                  must be explicitly testnet/futurenet/mainnet;
 *                             an unknown value fails closed.
 *
 * Client flags (`NEXT_PUBLIC_*`) only decide whether the UI is shown. The
 * `/api/transactions/send` route evaluates the server-only `MUX_*` flags on
 * every request, so flipping a client flag cannot bypass the gate. The Mux
 * backend remains the source of truth for spends.
 */

export type StellarNetwork = "testnet" | "futurenet" | "mainnet";

export interface SendFlowFlags {
	enabled: boolean;
	killSwitch: boolean;
	mainnetEnabled: boolean;
	network: StellarNetwork | null;
}

export const SEND_GATE_CODES = {
	OK: "SEND_OK",
	DISABLED: "SEND_DISABLED",
	KILL_SWITCH_ENGAGED: "SEND_KILL_SWITCH_ENGAGED",
	NETWORK_MISCONFIGURED: "SEND_NETWORK_MISCONFIGURED",
	MAINNET_NOT_ENABLED: "SEND_MAINNET_NOT_ENABLED",
	NETWORK_MISMATCH: "SEND_NETWORK_MISMATCH",
} as const;

export type SendGateCode =
	(typeof SEND_GATE_CODES)[keyof typeof SEND_GATE_CODES];

export type SendGateResult =
	| { allowed: true; code: typeof SEND_GATE_CODES.OK; network: StellarNetwork }
	| { allowed: false; code: Exclude<SendGateCode, typeof SEND_GATE_CODES.OK> };

type Env = Record<string, string | undefined>;

/** Opt-in flags: only an explicit "true"/"1" enables. */
export function parseOptInFlag(value: string | undefined): boolean {
	const normalized = value?.trim().toLowerCase();
	return normalized === "true" || normalized === "1";
}

/** Kill switches fail closed: anything but unset/"false"/"0" engages. */
export function parseKillSwitch(value: string | undefined): boolean {
	const normalized = value?.trim().toLowerCase();
	if (normalized === undefined || normalized === "") return false;
	return normalized !== "false" && normalized !== "0";
}

export function parseNetwork(value: string | undefined): StellarNetwork | null {
	const normalized = value?.trim().toLowerCase();
	if (normalized === "testnet" || normalized === "futurenet") {
		return normalized;
	}
	if (normalized === "mainnet" || normalized === "public") return "mainnet";
	return null;
}

/** Server-only flags, evaluated on every send request. */
export function readServerSendFlowFlags(env: Env = process.env): SendFlowFlags {
	return {
		enabled: parseOptInFlag(env.MUX_SEND_FLOWS_ENABLED),
		killSwitch: parseKillSwitch(env.MUX_SEND_KILL_SWITCH),
		mainnetEnabled: parseOptInFlag(env.MUX_SEND_MAINNET_ENABLED),
		network: parseNetwork(configuredNetwork(env) ?? undefined),
	};
}

/**
 * Client flags for UI gating only. Each `process.env.NEXT_PUBLIC_*` is
 * referenced literally so Next.js can inline it into the browser bundle.
 */
export function readClientSendFlowFlags(): SendFlowFlags {
	return {
		enabled: parseOptInFlag(process.env.NEXT_PUBLIC_SEND_FLOWS_ENABLED),
		killSwitch: parseKillSwitch(process.env.NEXT_PUBLIC_SEND_KILL_SWITCH),
		mainnetEnabled: parseOptInFlag(
			process.env.NEXT_PUBLIC_SEND_MAINNET_ENABLED,
		),
		network: parseNetwork(process.env.NEXT_PUBLIC_STELLAR_NETWORK),
	};
}

/**
 * Evaluate the send gate. Order matters: the kill switch wins over every
 * other flag, and a request for a network other than the configured one is
 * rejected so a mainnet send is never satisfied by testnet config.
 */
export function evaluateSendFlowGate(
	flags: SendFlowFlags,
	requestedNetwork?: string | null,
): SendGateResult {
	if (flags.killSwitch) {
		return { allowed: false, code: SEND_GATE_CODES.KILL_SWITCH_ENGAGED };
	}
	if (!flags.enabled) {
		return { allowed: false, code: SEND_GATE_CODES.DISABLED };
	}
	if (flags.network === null) {
		return { allowed: false, code: SEND_GATE_CODES.NETWORK_MISCONFIGURED };
	}
	if (flags.network === "mainnet" && !flags.mainnetEnabled) {
		return { allowed: false, code: SEND_GATE_CODES.MAINNET_NOT_ENABLED };
	}
	if (
		requestedNetwork !== undefined &&
		parseNetwork(requestedNetwork ?? undefined) !== flags.network
	) {
		return { allowed: false, code: SEND_GATE_CODES.NETWORK_MISMATCH };
	}
	return { allowed: true, code: SEND_GATE_CODES.OK, network: flags.network };
}
