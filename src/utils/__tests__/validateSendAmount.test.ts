import { describe, expect, it } from "vitest";
import {
	STROOP_DECIMALS,
	isStroopPrecise,
	validateSendAmount,
} from "../validateSendAmount";

describe("validateSendAmount", () => {
	it("rejects empty amount", () => {
		expect(validateSendAmount("", 100).isValid).toBe(false);
	});

	it("rejects non-positive amount", () => {
		expect(validateSendAmount("0", 100).isValid).toBe(false);
		expect(validateSendAmount("-5", 100).isValid).toBe(false);
	});

	it("rejects amount exceeding balance", () => {
		const result = validateSendAmount("150", 100);
		expect(result.isValid).toBe(false);
		expect(result.error).toContain("exceeds available balance");
	});

	it("accepts valid amount within balance", () => {
		expect(validateSendAmount("50", 100).isValid).toBe(true);
	});

	// --- stroop precision (#696) ---

	it("rejects amount with more than 7 decimal places", () => {
		const result = validateSendAmount("1.00000001", 100);
		expect(result.isValid).toBe(false);
		expect(result.error).toContain("decimal places");
	});

	it("rejects amount with 8 decimal places", () => {
		const result = validateSendAmount("0.00000001", 1);
		expect(result.isValid).toBe(false);
		expect(result.error).toContain("decimal places");
	});

	it("accepts minimum stroop amount (0.0000001 XLM)", () => {
		expect(validateSendAmount("0.0000001", 1).isValid).toBe(true);
	});

	it("accepts amount with exactly 7 decimal places", () => {
		expect(validateSendAmount("1.1234567", 100).isValid).toBe(true);
	});

	it("accepts integer amounts", () => {
		expect(validateSendAmount("10", 100).isValid).toBe(true);
	});

	it("accepts amounts with fewer than 7 decimal places", () => {
		expect(validateSendAmount("1.5", 100).isValid).toBe(true);
		expect(validateSendAmount("1.12", 100).isValid).toBe(true);
	});

	it("error message mentions stroop decimal limit", () => {
		const result = validateSendAmount("1.00000001", 100);
		expect(result.error).toContain(`${STROOP_DECIMALS}`);
	});

	it("stroop precision check runs before balance check", () => {
		// Even if balance is large, an over-precise amount must be caught first.
		const result = validateSendAmount("1.00000001", 1000);
		expect(result.isValid).toBe(false);
		expect(result.error).toContain("decimal places");
	});
});

describe("isStroopPrecise", () => {
	it("returns true for whole numbers", () => {
		expect(isStroopPrecise("100")).toBe(true);
		expect(isStroopPrecise("0")).toBe(true);
	});

	it("returns true for amounts with exactly 7 decimals", () => {
		expect(isStroopPrecise("1.1234567")).toBe(true);
	});

	it("returns true for the minimum stroop amount", () => {
		expect(isStroopPrecise("0.0000001")).toBe(true);
	});

	it("returns false for amounts with more than 7 decimals", () => {
		expect(isStroopPrecise("1.00000001")).toBe(false);
		expect(isStroopPrecise("0.00000001")).toBe(false);
	});

	it("handles trailing zeros correctly", () => {
		// 1.10000000 has the 8th decimal as 0, so it is precise
		expect(isStroopPrecise("1.1000000")).toBe(true);
	});

	it("STROOP_DECIMALS constant equals 7", () => {
		expect(STROOP_DECIMALS).toBe(7);
	});
});
