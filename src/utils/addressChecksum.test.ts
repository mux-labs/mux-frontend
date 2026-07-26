import { describe, expect, it } from "vitest";
import { hasValidStellarChecksum } from "@/utils/addressValidation";
import { validateStellarAddress } from "@/utils/addressFormatting";

const VALID = "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";

describe("Stellar address checksum", () => {
	it("accepts an account ID with a valid StrKey checksum", () => {
		expect(hasValidStellarChecksum(VALID)).toBe(true);
		expect(validateStellarAddress(VALID)).toEqual({ valid: true });
	});

	it("rejects a structurally valid account ID with a changed checksum", () => {
		const changed = `${VALID.slice(0, -1)}A`;
		expect(hasValidStellarChecksum(changed)).toBe(false);
		expect(validateStellarAddress(changed).error).toMatch(/checksum/i);
	});
});
