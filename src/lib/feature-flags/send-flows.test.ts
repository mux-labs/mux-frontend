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
	it("opt-in flags are deny-by-default", () => {
		expect(parseOptInFlag(undefined)).toBe(false);
		expect(parseOptInFlag("")).toBe(false);
		expect(parseOptInFlag("yes")).toBe(false);
		expect(parseOptInFlag("TRUE ")).toBe(true);
		expect(parseOptInFlag("1")).toBe(true);
	});

	it("kill switch fails closed on unrecognised values", () => {
		expect(parseKillSwitch(undefined)).toBe(false);
		expect(parseKillSwitch("")).toBe(false);
		expect(parseKillSwitch("false")).toBe(false);
		expect(parseKillSwitch("0")).toBe(false);
		expect(parseKillSwitch("true")).toBe(true);
		expect(parseKillSwitch("flase")).toBe(true);
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
