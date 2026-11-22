import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	evaluateSendFlowGate,
	parseKillSwitch,
	parseNetwork,
	parseOptInFlag,
	readClientSendFlowFlags,
	readServerSendFlowFlags,
	SEND_GATE_CODES,
	type SendFlowFlags,
} from "./send-flows";

const TESTNET_ON: SendFlowFlags = {
	enabled: true,
	killSwitch: false,
	mainnetEnabled: false,
	network: "testnet",
};

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
		expect(parseOptInFlag("yes")).toBe(false);
		expect(parseOptInFlag("0")).toBe(false);
		expect(parseOptInFlag(undefined)).toBe(false);
	});
});

describe("parseKillSwitch", () => {
	it("fails closed on anything but false/0", () => {
		expect(parseKillSwitch(undefined)).toBe(false);
		expect(parseKillSwitch("")).toBe(false);
		expect(parseKillSwitch("false")).toBe(false);
		expect(parseKillSwitch("0")).toBe(false);
		expect(parseKillSwitch("true")).toBe(true);
		expect(parseKillSwitch("typo")).toBe(true);
	});

	it("engages for every value other than unset/false/0", () => {
		const disengaged = new Set([undefined, "", "false", "0"]);
		const values = [
			undefined,
			"",
			" ",
			"false",
			"FALSE",
			" false ",
			"0",
			" 0 ",
			"00",
			"1",
			"true",
			"TRUE",
			"yes",
			"no",
			"off",
			"disabled",
			"null",
			"undefined",
			"typo",
			"falsey",
			"0.0",
			"-0",
			"kill",
		];
		for (const value of values) {
			expect(parseKillSwitch(value), `value: ${JSON.stringify(value)}`).toBe(
				!disengaged.has(value),
			);
		}
	});

	it("treats whitespace-only values as unset (disengaged)", () => {
		expect(parseKillSwitch("   ")).toBe(false);
		expect(parseKillSwitch("\t\n")).toBe(false);
	});
});

describe("parseNetwork", () => {
	it("maps known networks and rejects unknown", () => {
		expect(parseNetwork("testnet")).toBe("testnet");
		expect(parseNetwork("futurenet")).toBe("futurenet");
		expect(parseNetwork("mainnet")).toBe("mainnet");
		expect(parseNetwork("public")).toBe("mainnet");
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

	it("rejects a requested network that does not match", () => {
		const result = evaluateSendFlowGate(TESTNET_ON, "mainnet");
		expect(result).toEqual({
			allowed: false,
			code: SEND_GATE_CODES.NETWORK_MISMATCH,
		});
	});
});
