import { describe, expect, it } from "vitest";
import {
	MIN_XLM_AMOUNT,
	XLM_MAX_DECIMALS,
	formatXLM,
	isExactStroopAmount,
	toStroopPrecision,
} from "./xlmFormat";

describe("formatXLM", () => {
	it("formats a whole number with 2 decimal places by default", () => {
		expect(formatXLM(100)).toBe("100.00 XLM");
	});

	it("preserves up to 7 decimal places for precise amounts", () => {
		expect(formatXLM("1.1234567")).toBe("1.1234567 XLM");
	});

	it("adds thousands separators", () => {
		expect(formatXLM(1234567)).toBe("1,234,567.00 XLM");
	});

	it("falls back to 0.00 XLM for invalid input", () => {
		expect(formatXLM("not-a-number")).toBe("0.00 XLM");
	});

	it("respects custom min/max decimal options", () => {
		expect(formatXLM(5, { minDecimals: 0, maxDecimals: 0 })).toBe("5 XLM");
	});
});

// --- stroop precision (#696) ---

describe("toStroopPrecision", () => {
	it("rounds to 7 decimal places", () => {
		expect(toStroopPrecision(1.12345678)).toBe(1.1234568);
	});

	it("leaves already-precise values unchanged", () => {
		expect(toStroopPrecision(1.1234567)).toBe(1.1234567);
	});

	it("handles integer input", () => {
		expect(toStroopPrecision(10)).toBe(10);
	});

	it("handles string input", () => {
		expect(toStroopPrecision("0.0000001")).toBe(0.0000001);
	});

	it("returns NaN for non-numeric strings", () => {
		expect(toStroopPrecision("abc")).toBeNaN();
	});

	it("returns NaN for Infinity", () => {
		expect(toStroopPrecision(Number.POSITIVE_INFINITY)).toBeNaN();
	});
});

describe("isExactStroopAmount", () => {
	it("returns true for exact stroop amounts", () => {
		expect(isExactStroopAmount(1.1234567)).toBe(true);
		expect(isExactStroopAmount(0.0000001)).toBe(true);
		expect(isExactStroopAmount(100)).toBe(true);
	});

	it("returns false for amounts with sub-stroop precision", () => {
		// 0.00000001 is below 1 stroop
		expect(isExactStroopAmount(0.00000001)).toBe(false);
	});

	it("returns false for non-finite values", () => {
		expect(isExactStroopAmount(Number.NaN)).toBe(false);
		expect(isExactStroopAmount(Number.POSITIVE_INFINITY)).toBe(false);
	});

	it("handles string input", () => {
		expect(isExactStroopAmount("1.1234567")).toBe(true);
		expect(isExactStroopAmount("not-a-number")).toBe(false);
	});
});

describe("constants", () => {
	it("MIN_XLM_AMOUNT is one stroop in XLM", () => {
		expect(MIN_XLM_AMOUNT).toBe(0.0000001);
	});

	it("XLM_MAX_DECIMALS is 7", () => {
		expect(XLM_MAX_DECIMALS).toBe(7);
	});
});
