import { describe, expect, it } from "vitest";
import { formatXLM } from "./xlmFormat";

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
