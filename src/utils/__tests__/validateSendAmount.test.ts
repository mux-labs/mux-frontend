import { describe, expect, it } from "vitest";
import { validateSendAmount } from "../validateSendAmount";

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
});
