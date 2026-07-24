import { describe, it, expect } from "vitest";
import {
	formatFull,
	formatTruncated,
	formatShort,
	formatChunked,
	formatMasked,
	formatGrouped,
	formatAddress,
	formatAddresses,
	compareAddresses,
	extractFullAddress,
	getFormatDescription,
	getAvailableFormats,
	validateFormattingOptions,
} from "@/utils/addressFormatter";
import {
	truncateAddress,
	validateStellarAddress,
} from "@/utils/addressFormatting";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const VALID = "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
const INVALID_SHORT = "GBZXN7PIRZGN";
const INVALID_CHARS = "1BZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
const EMPTY = "";

// ---------------------------------------------------------------------------
// formatFull
// ---------------------------------------------------------------------------
describe("formatFull", () => {
	it("returns the address unchanged for a valid address", () => {
		expect(formatFull(VALID)).toBe(VALID);
	});

	it("passes through an invalid address unchanged", () => {
		expect(formatFull(INVALID_SHORT)).toBe(INVALID_SHORT);
	});
});

// ---------------------------------------------------------------------------
// formatTruncated
// ---------------------------------------------------------------------------
describe("formatTruncated", () => {
	it("truncates to 6...4 pattern", () => {
		expect(formatTruncated(VALID)).toBe(`${VALID.slice(0, 6)}...${VALID.slice(-4)}`);
	});

	it("passes through an invalid address", () => {
		expect(formatTruncated(INVALID_SHORT)).toBe(INVALID_SHORT);
	});
});

// ---------------------------------------------------------------------------
// formatShort
// ---------------------------------------------------------------------------
describe("formatShort", () => {
	it("returns the first 12 characters", () => {
		expect(formatShort(VALID)).toBe(VALID.slice(0, 12));
		expect(formatShort(VALID)).toHaveLength(12);
	});

	it("passes through an invalid address", () => {
		expect(formatShort(INVALID_SHORT)).toBe(INVALID_SHORT);
	});
});

// ---------------------------------------------------------------------------
// formatChunked
// ---------------------------------------------------------------------------
describe("formatChunked", () => {
	it("splits into 7-char chunks by default", () => {
		const result = formatChunked(VALID);
		const parts = result.split(" ");
		// All chunks except possibly the last should be 7 chars
		expect(parts.every((p, i) => i === parts.length - 1 || p.length === 7)).toBe(true);
	});

	it("respects a custom chunkSize", () => {
		const result = formatChunked(VALID, 8, "-");
		const parts = result.split("-");
		expect(parts[0]).toHaveLength(8);
	});

	it("passes through an invalid address", () => {
		expect(formatChunked(INVALID_SHORT)).toBe(INVALID_SHORT);
	});

	it("returns address unchanged when chunkSize ≤ 0", () => {
		expect(formatChunked(VALID, 0)).toBe(VALID);
	});
});

// ---------------------------------------------------------------------------
// formatMasked
// ---------------------------------------------------------------------------
describe("formatMasked", () => {
	it("preserves first and last 12 chars and masks the middle", () => {
		const result = formatMasked(VALID);
		expect(result.startsWith(VALID.slice(0, 12))).toBe(true);
		expect(result.endsWith(VALID.slice(-12))).toBe(true);
		expect(result).toContain("*");
	});

	it("total length equals original length", () => {
		expect(formatMasked(VALID)).toHaveLength(VALID.length);
	});

	it("passes through an invalid address", () => {
		expect(formatMasked(INVALID_SHORT)).toBe(INVALID_SHORT);
	});
});

// ---------------------------------------------------------------------------
// formatGrouped
// ---------------------------------------------------------------------------
describe("formatGrouped", () => {
	it("splits into 4-char groups by default", () => {
		const parts = formatGrouped(VALID).split(" ");
		expect(parts[0]).toHaveLength(4);
	});

	it("respects a custom groupSize", () => {
		const parts = formatGrouped(VALID, 6, "|").split("|");
		expect(parts[0]).toHaveLength(6);
	});

	it("passes through an invalid address", () => {
		expect(formatGrouped(INVALID_SHORT)).toBe(INVALID_SHORT);
	});
});

// ---------------------------------------------------------------------------
// formatAddress (main dispatcher)
// ---------------------------------------------------------------------------
describe("formatAddress", () => {
	it("returns isValid=true for a valid address", () => {
		const result = formatAddress(VALID);
		expect(result.isValid).toBe(true);
		expect(result.error).toBeNull();
	});

	it("returns isValid=false for an invalid address", () => {
		const result = formatAddress(INVALID_SHORT);
		expect(result.isValid).toBe(false);
		expect(result.error).not.toBeNull();
	});

	it("returns isValid=false for an empty string", () => {
		const result = formatAddress(EMPTY);
		expect(result.isValid).toBe(false);
	});

	it("dispatches to the correct format — truncated", () => {
		const result = formatAddress(VALID, { format: "truncated" });
		expect(result.formatted).toMatch(/^.{6}\.\.\..{4}$/);
	});

	it("dispatches to the correct format — short", () => {
		const result = formatAddress(VALID, { format: "short" });
		expect(result.formatted).toHaveLength(12);
	});

	it("dispatches to the correct format — chunked", () => {
		const result = formatAddress(VALID, { format: "chunked" });
		expect(result.formatted).toContain(" ");
	});

	it("dispatches to the correct format — masked", () => {
		const result = formatAddress(VALID, { format: "masked" });
		expect(result.formatted).toContain("*");
	});

	it("dispatches to the correct format — grouped", () => {
		const result = formatAddress(VALID, { format: "grouped" });
		expect(result.formatted).toContain(" ");
	});

	it("stores the original address in the result", () => {
		const result = formatAddress(VALID, { format: "truncated" });
		expect(result.original).toBe(VALID);
	});
});

// ---------------------------------------------------------------------------
// formatAddresses (batch)
// ---------------------------------------------------------------------------
describe("formatAddresses", () => {
	it("formats an array of addresses", () => {
		const results = formatAddresses([VALID, VALID], { format: "truncated" });
		expect(results).toHaveLength(2);
		expect(results[0].isValid).toBe(true);
	});

	it("returns an empty array for an empty input", () => {
		expect(formatAddresses([])).toHaveLength(0);
	});

	it("handles a mix of valid and invalid addresses", () => {
		const results = formatAddresses([VALID, INVALID_SHORT]);
		expect(results[0].isValid).toBe(true);
		expect(results[1].isValid).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// compareAddresses
// ---------------------------------------------------------------------------
describe("compareAddresses", () => {
	it("returns true for identical valid addresses", () => {
		expect(compareAddresses(VALID, VALID)).toBe(true);
	});

	it("returns false for two different valid addresses", () => {
		const OTHER = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
		expect(compareAddresses(VALID, OTHER)).toBe(false);
	});

	it("returns false when either address is empty", () => {
		expect(compareAddresses(VALID, EMPTY)).toBe(false);
		expect(compareAddresses(EMPTY, VALID)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// extractFullAddress
// ---------------------------------------------------------------------------
describe("extractFullAddress", () => {
	it("extracts a valid address from a clean string", () => {
		expect(extractFullAddress(VALID)).toBe(VALID);
	});

	it("returns null for an invalid address", () => {
		expect(extractFullAddress(INVALID_CHARS)).toBeNull();
	});

	it("returns null for an empty string", () => {
		expect(extractFullAddress(EMPTY)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// getFormatDescription
// ---------------------------------------------------------------------------
describe("getFormatDescription", () => {
	it("returns a non-empty string for each known format", () => {
		const formats = getAvailableFormats();
		for (const fmt of formats) {
			expect(getFormatDescription(fmt).length).toBeGreaterThan(0);
		}
	});
});

// ---------------------------------------------------------------------------
// getAvailableFormats
// ---------------------------------------------------------------------------
describe("getAvailableFormats", () => {
	it("returns an array with 6 formats", () => {
		expect(getAvailableFormats()).toHaveLength(6);
	});

	it("includes the expected format types", () => {
		const formats = getAvailableFormats();
		expect(formats).toContain("full");
		expect(formats).toContain("truncated");
		expect(formats).toContain("masked");
	});
});

// ---------------------------------------------------------------------------
// validateFormattingOptions
// ---------------------------------------------------------------------------
describe("validateFormattingOptions", () => {
	it("returns valid for empty options", () => {
		expect(validateFormattingOptions({}).isValid).toBe(true);
	});

	it("returns invalid when chunkSize ≤ 0", () => {
		expect(validateFormattingOptions({ chunkSize: 0 }).isValid).toBe(false);
		expect(validateFormattingOptions({ chunkSize: -1 }).isValid).toBe(false);
	});

	it("returns invalid when groupSize ≤ 0", () => {
		expect(validateFormattingOptions({ groupSize: 0 }).isValid).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// addressFormatting.ts helpers (truncateAddress, validateStellarAddress)
// ---------------------------------------------------------------------------
describe("truncateAddress (addressFormatting)", () => {
	it("truncates long addresses to 6...4 pattern", () => {
		expect(truncateAddress(VALID)).toBe(`${VALID.slice(0, 6)}...${VALID.slice(-4)}`);
	});

	it("returns short strings unchanged", () => {
		expect(truncateAddress("GBZXN7")).toBe("GBZXN7");
	});
});

describe("validateStellarAddress (addressFormatting)", () => {
	it("returns valid=true for a valid address", () => {
		expect(validateStellarAddress(VALID).valid).toBe(true);
	});

	it("returns valid=false with an error for an empty string", () => {
		const result = validateStellarAddress(EMPTY);
		expect(result.valid).toBe(false);
		expect(result.error).toBeTruthy();
	});

	it("returns an error when address does not start with G", () => {
		const result = validateStellarAddress(`A${VALID.slice(1)}`);
		expect(result.valid).toBe(false);
		expect(result.error).toMatch(/must start with 'G'/i);
	});

	it("returns an error when address is wrong length", () => {
		const result = validateStellarAddress(VALID.slice(0, 40));
		expect(result.valid).toBe(false);
		expect(result.error).toMatch(/56 characters/i);
	});

	it("returns an error for invalid characters", () => {
		const bad = `G${"1".repeat(55)}`;
		const result = validateStellarAddress(bad);
		expect(result.valid).toBe(false);
		expect(result.error).toMatch(/invalid characters/i);
	});
});
