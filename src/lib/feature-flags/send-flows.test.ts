import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	SEND_GATE_CODES,
	evaluateSendFlowGate,
	parseKillSwitch,
	parseNetwork,
	parseOptInFlag,
	readClientSendFlowFlags,
	readServerSendFlowFlags,
	SEND_GATE_CODES,
	type SendFlowFlags,
} from "./send-flows";

const baseFlags: SendFlowFlags = {
	enabled: true,
	killSwitch: false,
	mainnetEnabled: false,
	network: "testnet",
	mainnetOptIn: false,
};

describe("evaluateSendFlowGate", () => {
	it("allows sends when enabled and configured", () => {
		const result = evaluateSendFlowGate(baseInput);
		expect(result.allowed).toBe(true);
		expect(result.code).toBe(SEND_GATE_CODES.SEND_OK);
	});

	it("blocks when the kill switch is engaged", () => {
		const result = evaluateSendFlowGate({
			...baseInput,
			killSwitchEngaged: true,
		});
		expect(result.allowed).toBe(false);
		expect(result.code).toBe(SEND_GATE_CODES.SEND_KILL_SWITCH_ENGAGED);
	});

	it("blocks when sends are disabled", () => {
		const result = evaluateSendFlowGate({ ...baseInput, sendEnabled: false });
		expect(result.allowed).toBe(false);
		expect(result.code).toBe(SEND_GATE_CODES.SEND_DISABLED);
	});

	it("blocks when the network is misconfigured", () => {
		const result = evaluateSendFlowGate({ ...baseInput, network: null });
		expect(result.allowed).toBe(false);
		expect(result.code).toBe(SEND_GATE_CODES.SEND_NETWORK_MISCONFIGURED);
	});

	it("blocks mainnet without opt-in", () => {
		const result = evaluateSendFlowGate({
			...baseInput,
			network: "mainnet",
			mainnetOptIn: false,
		});
		expect(result.allowed).toBe(false);
		expect(result.code).toBe(SEND_GATE_CODES.SEND_MAINNET_NOT_ENABLED);
	});

	it("blocks on network mismatch", () => {
		const result = evaluateSendFlowGate({
			...baseInput,
			requestedNetwork: "mainnet",
		});
		expect(result.allowed).toBe(false);
		expect(result.code).toBe(SEND_GATE_CODES.SEND_NETWORK_MISMATCH);
	});

	it("blocks on network mismatch when requestedNetwork is null", () => {
		const result = evaluateSendFlowGate({
			...baseInput,
			requestedNetwork: null,
		});
		expect(result.allowed).toBe(false);
		expect(result.code).toBe(SEND_GATE_CODES.SEND_NETWORK_MISMATCH);
	});

	it("blocks on network mismatch when requestedNetwork is a blank string", () => {
		const result = evaluateSendFlowGate({
			...baseInput,
			requestedNetwork: "",
		});
		expect(result.allowed).toBe(false);
		expect(result.code).toBe(SEND_GATE_CODES.SEND_NETWORK_MISMATCH);
	});

	it("allows when requestedNetwork is undefined (no network requested)", () => {
		const result = evaluateSendFlowGate({
			...baseInput,
			requestedNetwork: undefined,
		});
		expect(result.allowed).toBe(true);
		expect(result.code).toBe(SEND_GATE_CODES.SEND_OK);
	});
});

describe("SEND_GATE_CODES contract", () => {
	it("exports the exact string values the e2e spec asserts against", () => {
		expect(SEND_GATE_CODES).toEqual({
			SEND_OK: "SEND_OK",
			SEND_DISABLED: "SEND_DISABLED",
			SEND_KILL_SWITCH_ENGAGED: "SEND_KILL_SWITCH_ENGAGED",
			SEND_NETWORK_MISCONFIGURED: "SEND_NETWORK_MISCONFIGURED",
			SEND_MAINNET_NOT_ENABLED: "SEND_MAINNET_NOT_ENABLED",
			SEND_NETWORK_MISMATCH: "SEND_NETWORK_MISMATCH",
		});
	});

	it("returns a code present in SEND_GATE_CODES for every branch", () => {
		const branches: SendFlowGateInput[] = [
			{ ...baseInput, killSwitchEngaged: true },
			{ ...baseInput, sendEnabled: false },
			{ ...baseInput, network: null },
			{ ...baseInput, network: "mainnet", mainnetOptIn: false },
			{ ...baseInput, requestedNetwork: "mainnet" },
			{ ...baseInput, requestedNetwork: null },
			{ ...baseInput, requestedNetwork: "" },
			{ ...baseInput, requestedNetwork: undefined },
			baseInput,
		];

		for (const input of branches) {
			const result = evaluateSendFlowGate(input);
			expect(Object.values(SEND_GATE_CODES)).toContain(result.code);
		}
	});
});

const ENV_KEYS = [
	"MUX_SEND_FLOWS_ENABLED",
	"MUX_SEND_KILL_SWITCH",
	"MUX_SEND_MAINNET_ENABLED",
	"MUX_STELLAR_NETWORK",
	"NEXT_PUBLIC_SEND_FLOWS_ENABLED",
	"NEXT_PUBLIC_SEND_KILL_SWITCH",
	"NEXT_PUBLIC_SEND_MAINNET_ENABLED",
	"NEXT_PUBLIC_STELLAR_NETWORK",
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
	savedEnv = {};
	for (const key of ENV_KEYS) {
		savedEnv[key] = process.env[key];
		delete process.env[key];
	}
});

afterEach(() => {
	for (const key of ENV_KEYS) {
		const value = savedEnv[key];
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
});

describe("SEND_GATE_CODES", () => {
	it("exposes exactly the six documented gate codes", () => {
		expect(Object.values(SEND_GATE_CODES).sort()).toEqual([
			"SEND_DISABLED",
			"SEND_KILL_SWITCH_ENGAGED",
			"SEND_MAINNET_NOT_ENABLED",
			"SEND_NETWORK_MISCONFIGURED",
			"SEND_NETWORK_MISMATCH",
			"SEND_OK",
		]);
	});
});

describe("parseOptInFlag", () => {
	it("only enables on explicit true/1", () => {
		expect(parseOptInFlag("true")).toBe(true);
		expect(parseOptInFlag("1")).toBe(true);
		expect(parseOptInFlag(" TRUE ")).toBe(true);
		expect(parseOptInFlag("false")).toBe(false);
		expect(parseOptInFlag("0")).toBe(false);
		expect(parseOptInFlag("yes")).toBe(false);
		expect(parseOptInFlag(undefined)).toBe(false);
	});
});

describe("parseKillSwitch", () => {
	it("fails closed on anything but false/0/unset", () => {
		expect(parseKillSwitch(undefined)).toBe(false);
		expect(parseKillSwitch("")).toBe(false);
		expect(parseKillSwitch("false")).toBe(false);
		expect(parseKillSwitch("0")).toBe(false);
		expect(parseKillSwitch("true")).toBe(true);
		expect(parseKillSwitch("typo")).toBe(true);
	});
});

describe("parseNetwork", () => {
	it("maps known networks and rejects unknown", () => {
		expect(parseNetwork("testnet")).toBe("testnet");
		expect(parseNetwork("futurenet")).toBe("futurenet");
		expect(parseNetwork("mainnet")).toBe("mainnet");
		expect(parseNetwork("public")).toBe("mainnet");
		expect(parseNetwork("PUBLIC")).toBe("mainnet");
		expect(parseNetwork(undefined)).toBeNull();
		expect(parseNetwork("")).toBeNull();
	});
});

describe("parseNetwork", () => {
	it("maps known networks and aliases", () => {
		expect(parseNetwork("testnet")).toBe("testnet");
		expect(parseNetwork("futurenet")).toBe("futurenet");
		expect(parseNetwork("mainnet")).toBe("mainnet");
		expect(parseNetwork("public")).toBe("mainnet");
		expect(parseNetwork("PUBLIC")).toBe("mainnet");
	});

	it("returns null for unknown or missing values", () => {
		expect(parseNetwork(undefined)).toBeNull();
		expect(parseNetwork("")).toBeNull();
		expect(parseNetwork("devnet")).toBeNull();
		expect(parseNetwork(undefined)).toBeNull();
	});
});

describe("readServerSendFlowFlags", () => {
	it("reads MUX_* vars", () => {
		process.env.MUX_SEND_FLOWS_ENABLED = "true";
		process.env.MUX_SEND_MAINNET_ENABLED = "1";
		process.env.MUX_STELLAR_NETWORK = "mainnet";
		const flags = readServerSendFlowFlags();
		expect(flags.enabled).toBe(true);
		expect(flags.mainnetEnabled).toBe(true);
		expect(flags.network).toBe("mainnet");
	});
});

describe("readServerSendFlowFlags", () => {
	it("reads MUX_* flags and configured network", () => {
		const flags = readServerSendFlowFlags({
			MUX_SEND_FLOWS_ENABLED: "true",
			MUX_SEND_KILL_SWITCH: "false",
			MUX_SEND_MAINNET_ENABLED: "1",
			MUX_STELLAR_NETWORK: "public",
		});
		expect(flags).toEqual({
			enabled: true,
			killSwitch: false,
			mainnetEnabled: true,
			network: "mainnet",
		});
	});

	it("ignores NEXT_PUBLIC_* vars", () => {
		process.env.NEXT_PUBLIC_SEND_FLOWS_ENABLED = "true";
		process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
		const flags = readServerSendFlowFlags();
		expect(flags.enabled).toBe(false);
		expect(flags.network).toBeNull();
	});
});

describe("readClientSendFlowFlags", () => {
	it("ignores MUX_* vars", () => {
		process.env.MUX_SEND_FLOWS_ENABLED = "true";
		process.env.MUX_SEND_MAINNET_ENABLED = "true";
		process.env.MUX_STELLAR_NETWORK = "mainnet";
		const flags = readClientSendFlowFlags();
		expect(flags.enabled).toBe(false);
		expect(flags.mainnetEnabled).toBe(false);
		expect(flags.network).toBeNull();
	});

	it("honours NEXT_PUBLIC_* vars", () => {
		process.env.NEXT_PUBLIC_SEND_FLOWS_ENABLED = "true";
		process.env.NEXT_PUBLIC_SEND_MAINNET_ENABLED = "1";
		process.env.NEXT_PUBLIC_STELLAR_NETWORK = "mainnet";
		const flags = readClientSendFlowFlags();
		expect(flags.enabled).toBe(true);
		expect(flags.mainnetEnabled).toBe(true);
		expect(flags.network).toBe("mainnet");
	});

	it("yields network: null for an unknown NEXT_PUBLIC_STELLAR_NETWORK", () => {
		process.env.NEXT_PUBLIC_SEND_FLOWS_ENABLED = "true";
		process.env.NEXT_PUBLIC_STELLAR_NETWORK = "devnet";
		const flags = readClientSendFlowFlags();
		expect(flags.network).toBeNull();
		const result = evaluateSendFlowGate(flags);
		expect(result.allowed).toBe(false);
		expect(result.code).toBe(SEND_GATE_CODES.NETWORK_MISCONFIGURED);
	});

	it("yields network: null for a blank NEXT_PUBLIC_STELLAR_NETWORK", () => {
		process.env.NEXT_PUBLIC_SEND_FLOWS_ENABLED = "true";
		process.env.NEXT_PUBLIC_STELLAR_NETWORK = "  ";
		const flags = readClientSendFlowFlags();
		expect(flags.network).toBeNull();
		const result = evaluateSendFlowGate(flags);
		expect(result.allowed).toBe(false);
		expect(result.code).toBe(SEND_GATE_CODES.NETWORK_MISCONFIGURED);
	});
});

describe("evaluateSendFlowGate", () => {
	it("allows a testnet send when enabled", () => {
		const result = evaluateSendFlowGate(TESTNET_ON, "testnet");
		expect(result).toEqual({
			allowed: true,
			code: SEND_GATE_CODES.OK,
			network: "testnet",
		});
	});

	it("denies when disabled", () => {
		const result = evaluateSendFlowGate({ ...TESTNET_ON, enabled: false });
		expect(result).toEqual({
			allowed: false,
			code: SEND_GATE_CODES.DISABLED,
		});
	});

	it("kill switch wins over everything", () => {
		const result = evaluateSendFlowGate({ ...TESTNET_ON, killSwitch: true });
		expect(result).toEqual({
			allowed: false,
			code: SEND_GATE_CODES.KILL_SWITCH_ENGAGED,
		});
	});

	it("fails closed on an unknown network", () => {
		const result = evaluateSendFlowGate({ ...TESTNET_ON, network: null });
		expect(result).toEqual({
			allowed: false,
			code: SEND_GATE_CODES.NETWORK_MISCONFIGURED,
		});
	});

	it("requires the mainnet opt-in", () => {
		const result = evaluateSendFlowGate({
			...TESTNET_ON,
			network: "mainnet",
			mainnetEnabled: false,
		});
		expect(result).toEqual({
			allowed: false,
			code: SEND_GATE_CODES.MAINNET_NOT_ENABLED,
		});
	});

	it("allows mainnet sends when mainnet is enabled", () => {
		expect(
			evaluateSendFlowGate({
				...baseFlags,
				network: "mainnet",
				mainnetEnabled: true,
			}),
		).toEqual({
			allowed: true,
			code: SEND_GATE_CODES.OK,
			network: "mainnet",
		});
	});

	it("rejects a requested network that does not match", () => {
		const result = evaluateSendFlowGate(TESTNET_ON, "mainnet");
		expect(result).toEqual({
			allowed: false,
			code: SEND_GATE_CODES.NETWORK_MISMATCH,
		});
	});

	it("accepts 'public' as a mainnet alias when configured for mainnet", () => {
		expect(
			evaluateSendFlowGate(
				{ ...baseFlags, network: "mainnet", mainnetEnabled: true },
				"public",
			),
		).toEqual({
			allowed: true,
			code: SEND_GATE_CODES.OK,
			network: "mainnet",
		});
	});

	it("rejects 'public' with a network mismatch when configured for testnet", () => {
		expect(
			evaluateSendFlowGate({ ...baseFlags, network: "testnet" }, "public"),
		).toEqual({ allowed: false, code: SEND_GATE_CODES.NETWORK_MISMATCH });
	});

	it("normalizes mixed-case requested networks before comparison", () => {
		expect(
			evaluateSendFlowGate({ ...baseFlags, network: "testnet" }, "TESTNET"),
		).toEqual({
			allowed: true,
			code: SEND_GATE_CODES.OK,
			network: "testnet",
		});
	});
});
	});
});
