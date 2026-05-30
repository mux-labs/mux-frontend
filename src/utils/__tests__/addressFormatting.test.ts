import { describe, expect, it } from "vitest";
import { truncateAddress } from "../addressFormatting";

describe("truncateAddress()", () => {
	it("returns the address unchanged when it is 12 chars or fewer", () => {
		expect(truncateAddress("GBZXN7")).toBe("GBZXN7");
		expect(truncateAddress("GBZXN7PIRZGN")).toBe("GBZXN7PIRZGN");
	});

	it("truncates a long Stellar address to first 6 + last 4 chars", () => {
		const address =
			"GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
		expect(truncateAddress(address)).toBe("GBZXN7...MADI");
	});

	it("truncates any address longer than 12 characters", () => {
		// slice(-4) of "ABCDEFGHIJKLMN" (14 chars) = "KLMN"
		expect(truncateAddress("ABCDEFGHIJKLMN")).toBe("ABCDEF...KLMN");
	});

	it("handles an address that is exactly 13 characters", () => {
		// slice(-4) of "ABCDEFGHIJKLM" (13 chars) = "JKLM"
		expect(truncateAddress("ABCDEFGHIJKLM")).toBe("ABCDEF...JKLM");
	});

	it("returns an empty string unchanged", () => {
		expect(truncateAddress("")).toBe("");
	});
});
