import { describe, expect, it } from "vitest";
import { DARK_MODE_PAIRS, contrastRatio, meetsAA } from "./contrast";

describe("contrast", () => {
	it("computes known ratios", () => {
		expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
		expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
	});

	it("rejects invalid colors", () => {
		expect(() => contrastRatio("red", "#000000")).toThrow();
	});

	it.each(DARK_MODE_PAIRS)("dark mode $name meets WCAG AA", ({ fg, bg }) => {
		expect(meetsAA(fg, bg)).toBe(true);
	});
});
