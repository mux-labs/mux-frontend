import { describe, expect, it } from "vitest";
import { shouldShowFaucet } from "./faucet";
import { getNetworkConfig } from "./network-resolver";

// Resolve network names through the resolver rather than trusting hardcoded
// strings, so the test fails loudly if the network table changes shape.
const CANDIDATE_NETWORKS = ["mainnet", "testnet", "futurenet"];
const testnet = CANDIDATE_NETWORKS.find(
	(name) => getNetworkConfig(name)?.isTestnet === true,
);
const mainnet = CANDIDATE_NETWORKS.find(
	(name) => getNetworkConfig(name)?.isTestnet === false,
);

describe("shouldShowFaucet", () => {
	it("resolves a known testnet and mainnet from the network resolver", () => {
		expect(testnet).toBeDefined();
		expect(mainnet).toBeDefined();
	});

	it("shows the faucet on a known testnet", () => {
		expect(shouldShowFaucet(testnet as string, undefined)).toBe(true);
		expect(shouldShowFaucet(testnet as string, "true")).toBe(true);
	});

	it("hides the faucet on mainnet", () => {
		expect(shouldShowFaucet(mainnet as string, undefined)).toBe(false);
		expect(shouldShowFaucet(mainnet as string, "true")).toBe(false);
	});

	it("respects the kill switch on every network", () => {
		expect(shouldShowFaucet(testnet as string, "false")).toBe(false);
		expect(shouldShowFaucet(mainnet as string, "false")).toBe(false);
	});

	it("only treats the exact string \"false\" as the kill switch", () => {
		expect(shouldShowFaucet(testnet as string, "FALSE")).toBe(true);
		expect(shouldShowFaucet(testnet as string, "")).toBe(true);
	});

	it("fails closed for missing networks", () => {
		expect(shouldShowFaucet(null, undefined)).toBe(false);
		expect(shouldShowFaucet(undefined, undefined)).toBe(false);
		expect(shouldShowFaucet("", undefined)).toBe(false);
	});

	it("fails closed for unknown networks", () => {
		expect(getNetworkConfig("unknown-network")).toBeNull();
		expect(shouldShowFaucet("unknown-network", undefined)).toBe(false);
		expect(shouldShowFaucet("devnet", undefined)).toBe(false);
	});
});
