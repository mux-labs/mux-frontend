import { describe, expect, it } from "vitest";
import {
	FRIENDBOT_DOCS_URL,
	FRIENDBOT_URL,
	MainnetFriendbotError,
	assertTestnetOnly,
	getFriendbotUrl,
	isFriendbotEligible,
	isValidAddressForFriendbot,
} from "../friendbot";

describe("friendbot utilities", () => {
	describe("isFriendbotEligible", () => {
		it("should return true for testnet", () => {
			expect(isFriendbotEligible("testnet")).toBe(true);
		});

		it("should return false for mainnet", () => {
			expect(isFriendbotEligible("mainnet")).toBe(false);
		});
	});

	describe("isValidAddressForFriendbot", () => {
		it("should validate correct Stellar address", () => {
			const address =
				"GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
			expect(isValidAddressForFriendbot(address)).toBe(true);
		});

		it("should validate another correct Stellar address", () => {
			const address =
				"GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE";
			expect(isValidAddressForFriendbot(address)).toBe(true);
		});

		it("should reject address not starting with G", () => {
			const address =
				"ABZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
			expect(isValidAddressForFriendbot(address)).toBe(false);
		});

		it("should reject address with wrong length", () => {
			const address = "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMAD";
			expect(isValidAddressForFriendbot(address)).toBe(false);
		});

		it("should reject empty string", () => {
			expect(isValidAddressForFriendbot("")).toBe(false);
		});

		it("should reject null/undefined", () => {
			expect(isValidAddressForFriendbot(null as any)).toBe(false);
			expect(isValidAddressForFriendbot(undefined as any)).toBe(false);
		});

		it("should reject non-string values", () => {
			expect(isValidAddressForFriendbot(123 as any)).toBe(false);
			expect(isValidAddressForFriendbot({} as any)).toBe(false);
		});
	});

	describe("getFriendbotUrl", () => {
		it("should generate correct Friendbot URL", () => {
			const address =
				"GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
			const url = getFriendbotUrl(address);
			expect(url).toContain(FRIENDBOT_URL);
			expect(url).toContain(`addr=${address}`);
		});

		it("should URL encode special characters in address", () => {
			const address = "test@example.com";
			const url = getFriendbotUrl(address);
			expect(url).toContain(encodeURIComponent(address));
		});

		it("should throw error for empty address", () => {
			expect(() => getFriendbotUrl("")).toThrow("Address cannot be empty");
		});

		it("should throw error for whitespace-only address", () => {
			expect(() => getFriendbotUrl("   ")).toThrow("Address cannot be empty");
		});

		it("should include addr parameter in query string", () => {
			const address =
				"GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
			const url = getFriendbotUrl(address);
			const urlObj = new URL(url);
			expect(urlObj.searchParams.get("addr")).toBe(address);
		});

		// --- mainnet guard (#695) ---

		it("throws MainnetFriendbotError when network is mainnet", () => {
			const address =
				"GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
			expect(() => getFriendbotUrl(address, "mainnet")).toThrow(
				MainnetFriendbotError,
			);
		});

		it("thrown error message mentions testnet-only restriction", () => {
			const address =
				"GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
			expect(() => getFriendbotUrl(address, "mainnet")).toThrow(/testnet/i);
		});

		it("does not throw when network is testnet", () => {
			const address =
				"GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
			expect(() => getFriendbotUrl(address, "testnet")).not.toThrow();
		});

		it("does not throw when network is omitted (backward compat)", () => {
			const address =
				"GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
			expect(() => getFriendbotUrl(address)).not.toThrow();
		});
	});

	// --- assertTestnetOnly (#695) ---

	describe("assertTestnetOnly", () => {
		it("throws MainnetFriendbotError on mainnet", () => {
			expect(() => assertTestnetOnly("mainnet")).toThrow(
				MainnetFriendbotError,
			);
		});

		it("does not throw on testnet", () => {
			expect(() => assertTestnetOnly("testnet")).not.toThrow();
		});

		it("error name is MainnetFriendbotError", () => {
			try {
				assertTestnetOnly("mainnet");
			} catch (err) {
				expect((err as Error).name).toBe("MainnetFriendbotError");
			}
		});
	});

	// --- MainnetFriendbotError class ---

	describe("MainnetFriendbotError", () => {
		it("is an instance of Error", () => {
			expect(new MainnetFriendbotError()).toBeInstanceOf(Error);
		});

		it("has a descriptive message", () => {
			const err = new MainnetFriendbotError();
			expect(err.message).toContain("testnet");
			expect(err.message).toContain("mainnet");
		});

		it("has the correct name", () => {
			expect(new MainnetFriendbotError().name).toBe("MainnetFriendbotError");
		});
	});

	describe("constants", () => {
		it("should have valid FRIENDBOT_URL", () => {
			expect(FRIENDBOT_URL).toBe("https://friendbot.stellar.org/");
		});

		it("should have valid FRIENDBOT_DOCS_URL", () => {
			expect(FRIENDBOT_DOCS_URL).toContain("developers.stellar.org");
			expect(FRIENDBOT_DOCS_URL).toContain("testnet");
		});
	});
});
