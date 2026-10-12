import { describe, expect, it } from "vitest";
import {
	evaluateSendFlowGate,
	parseKillSwitch,
	parseNetwork,
	parseOptInFlag,
	readServerSendFlowFlags,
	type SendFlowFlags,
} from "./send-flows";

const TESTNET_ON: SendFlowFlags = {
	enabled: true,
	killSwitch: false,
	mainnetEnabled: false,
	network: "testnet",
};

describe("flag parsing", () => {
	it("parseOptInFlag handles whitespace, casing, and deny-by-default values", () => {
		const cases: Array<[string | undefined, boolean]> = [
			[undefined, false],
			["", false],
			["TRUE ", true],
			[" 1 ", true],
			["yes", false],
			["0", false],
		];

		for (const [value, expected] of cases) {
			expect(parseOptInFlag(value)).toBe(expected);
		}
	});

	it("parseKillSwitch handles defaults and fails closed on unrecognised values", () => {
		const cases: Array<[string | undefined, boolean]> = [
			[undefined, false],
			["", false],
			["false", false],
			["FALSE ", false],
			["0", false],
			[" true ", true],
			["off", true],
			["typo", true],
		];

		for (const [value, expected] of cases) {
			expect(parseKillSwitch(value)).toBe(expected);
		}
	});

	it("network must be explicit", () => {
		expect(parseNetwork("Testnet")).toBe("testnet");
		expect(parseNetwork("public")).toBe("mainnet");
		expect(parseNetwork("mainnet ")).toBe("mainnet");
		expect(parseNetwork("")).toBeNull();
		expect(parseNetwork("devnet")).toBeNull();
	});

	it("server flags read only MUX_* flag vars (client flags cannot enable)", () => {
		const flags = readServerSendFlowFlags({
			NEXT_PUBLIC_SEND_FLOWS_ENABLED: "true",
			NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
		});
		expect(flags.enabled).toBe(false);
		expect(flags.network).toBe("testnet");
	});

	it("a blank server network var does not mask the public one", () => {
		expect(
			readServerSendFlowFlags({
				MUX_STELLAR_NETWORK: " ",
				NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
			}).network,
		).toBe("mainnet");
	});
});

describe("evaluateSendFlowGate", () => {
	it("allows an enabled testnet send", () => {
		expect(evaluateSendFlowGate(TESTNET_ON, "testnet")).toEqual({
			allowed: true,
			code: "SEND_OK",
			network: "testnet",
		});
	});

	it("kill switch overrides every other flag", () => {
		expect(evaluateSendFlowGate({ ...TESTNET_ON, killSwitch: true }).code).toBe(
			"SEND_KILL_SWITCH_ENGAGED",
		);
	});

	it("is disabled by default", () => {
		expect(evaluateSendFlowGate({ ...TESTNET_ON, enabled: false }).code).toBe(
			"SEND_DISABLED",
		);
	});

	it("fails closed when the network is misconfigured", () => {
		expect(evaluateSendFlowGate({ ...TESTNET_ON, network: null }).code).toBe(
			"SEND_NETWORK_MISCONFIGURED",
		);
	});

	it("requires a second opt-in for mainnet", () => {
		const mainnet = { ...TESTNET_ON, network: "mainnet" as const };
		expect(evaluateSendFlowGate(mainnet).code).toBe("SEND_MAINNET_NOT_ENABLED");
		expect(
			evaluateSendFlowGate({ ...mainnet, mainnetEnabled: true }, "mainnet")
				.allowed,
		).toBe(true);
	});

	it("rejects a request for a different network than configured", () => {
		expect(evaluateSendFlowGate(TESTNET_ON, "mainnet").code).toBe(
			"SEND_NETWORK_MISMATCH",
		);
		expect(evaluateSendFlowGate(TESTNET_ON, null).code).toBe(
			"SEND_NETWORK_MISMATCH",
		);
	});
});
