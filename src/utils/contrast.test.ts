import { describe, expect, it } from "vitest";
import {
	DARK_MODE_PAIRS,
	WCAG_AA_LARGE,
	WCAG_AA_NORMAL,
	contrastRatio,
	meetsAA,
	relativeLuminance,
} from "./contrast";

// Greys picked so their ratio against white straddles each AA threshold.
const JUST_ABOVE_NORMAL = "#767676"; // ~4.54:1 on white
const JUST_BELOW_NORMAL = "#777777"; // ~4.48:1 on white
const JUST_ABOVE_LARGE = "#949494"; // ~3.03:1 on white
const JUST_BELOW_LARGE = "#959595"; // ~2.99:1 on white

describe("relativeLuminance", () => {
	it("returns 0 for black and 1 for white", () => {
		expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
		expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
	});

	it("accepts upper-case hex and a missing leading #", () => {
		expect(relativeLuminance("FFFFFF")).toBeCloseTo(1, 5);
	});

	it.each(["#zzzzzz", "not-a-color", "#fff", "", "#1234567"])(
		"throws for malformed hex %j",
		(hex) => {
			expect(() => relativeLuminance(hex)).toThrow(/Invalid hex color/);
		},
	);
});

describe("contrastRatio", () => {
	it("computes the 21:1 black/white reference ratio", () => {
		expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
	});

	it("returns 1:1 for identical colors", () => {
		expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
	});

	it("is symmetric in its arguments", () => {
		expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(
			contrastRatio("#ffffff", "#000000"),
			10,
		);
		expect(contrastRatio("#60a5fa", "#09090b")).toBeCloseTo(
			contrastRatio("#09090b", "#60a5fa"),
			10,
		);
	});

	it("rejects invalid colors", () => {
		expect(() => contrastRatio("red", "#000000")).toThrow();
		expect(() => contrastRatio("#000000", "red")).toThrow();
	});
});

describe("meetsAA", () => {
	it("uses the WCAG 2.1 thresholds", () => {
		expect(WCAG_AA_NORMAL).toBe(4.5);
		expect(WCAG_AA_LARGE).toBe(3);
	});

	it("passes normal text at or above WCAG_AA_NORMAL and fails below it", () => {
		expect(contrastRatio(JUST_ABOVE_NORMAL, "#ffffff")).toBeGreaterThanOrEqual(
			WCAG_AA_NORMAL,
		);
		expect(contrastRatio(JUST_BELOW_NORMAL, "#ffffff")).toBeLessThan(
			WCAG_AA_NORMAL,
		);
		expect(meetsAA(JUST_ABOVE_NORMAL, "#ffffff")).toBe(true);
		expect(meetsAA(JUST_BELOW_NORMAL, "#ffffff")).toBe(false);
	});

	it("uses WCAG_AA_LARGE when largeText is true", () => {
		expect(contrastRatio(JUST_ABOVE_LARGE, "#ffffff")).toBeGreaterThanOrEqual(
			WCAG_AA_LARGE,
		);
		expect(contrastRatio(JUST_BELOW_LARGE, "#ffffff")).toBeLessThan(
			WCAG_AA_LARGE,
		);
		expect(meetsAA(JUST_ABOVE_LARGE, "#ffffff", true)).toBe(true);
		expect(meetsAA(JUST_BELOW_LARGE, "#ffffff", true)).toBe(false);
		// Between the two thresholds: large text passes, normal text does not.
		expect(meetsAA(JUST_BELOW_NORMAL, "#ffffff", true)).toBe(true);
		expect(meetsAA(JUST_BELOW_NORMAL, "#ffffff", false)).toBe(false);
	});
});

describe("DARK_MODE_PAIRS", () => {
	it("is not empty", () => {
		expect(DARK_MODE_PAIRS.length).toBeGreaterThan(0);
	});

	it.each(DARK_MODE_PAIRS)(
		"dark mode $name meets WCAG AA",
		({ name, fg, bg }) => {
			expect(
				meetsAA(fg, bg),
				`${name} (${fg} on ${bg}) is ${contrastRatio(fg, bg).toFixed(2)}:1`,
			).toBe(true);
		},
	);
});
