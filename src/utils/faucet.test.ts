import { describe, expect, it } from "vitest";
import { shouldShowFaucet } from "./faucet";

describe("shouldShowFaucet", () => {
	it("hides the faucet on mainnet", () => {
		expect(shouldShowFaucet("mainnet", undefined)).toBe(false);
	});

	it("shows the faucet on test networks", () => {
		expect(shouldShowFaucet("testnet", undefined)).toBe(true);
		expect(shouldShowFaucet("futurenet", undefined)).toBe(true);
	});

	it("fails closed for unknown or missing networks", () => {
		expect(shouldShowFaucet("devnet", undefined)).toBe(false);
		expect(shouldShowFaucet(undefined, undefined)).toBe(false);
	});

	it("respects the kill switch", () => {
		expect(shouldShowFaucet("testnet", "false")).toBe(false);
	});
});
