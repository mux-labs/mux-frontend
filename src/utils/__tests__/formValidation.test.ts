/**
 * Tests for form validation utilities
 */
import { describe, it, expect } from "vitest";
import {
	validateApiKeyName,
	validateWalletLabel,
	validateNetwork,
	validateSpendingLimit,
	validateEmail,
	validateRecoveryCode,
	validateNotInList,
	validateRequired,
} from "@/utils/formValidation";

describe("Form Validation Utilities", () => {
	describe("validateApiKeyName", () => {
		it("should reject empty names", () => {
			const result = validateApiKeyName("");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("required");
		});

		it("should reject names over 50 characters", () => {
			const result = validateApiKeyName("a".repeat(51));
			expect(result.valid).toBe(false);
		});

		it("should accept valid names", () => {
			const result = validateApiKeyName("Production API Key");
			expect(result.valid).toBe(true);
		});

		it("should reject special characters", () => {
			const result = validateApiKeyName("Key@#$%");
			expect(result.valid).toBe(false);
		});
	});

	describe("validateWalletLabel", () => {
		it("should allow empty labels", () => {
			const result = validateWalletLabel("");
			expect(result.valid).toBe(true);
		});

		it("should reject labels over 30 characters", () => {
			const result = validateWalletLabel("a".repeat(31));
			expect(result.valid).toBe(false);
		});

		it("should accept valid labels", () => {
			const result = validateWalletLabel("My Wallet");
			expect(result.valid).toBe(true);
		});

		it("should reject invalid characters", () => {
			const result = validateWalletLabel("Label<script>");
			expect(result.valid).toBe(false);
		});
	});

	describe("validateNetwork", () => {
		it("should accept mainnet", () => {
			const result = validateNetwork("mainnet");
			expect(result.valid).toBe(true);
		});

		it("should accept testnet", () => {
			const result = validateNetwork("testnet");
			expect(result.valid).toBe(true);
		});

		it("should reject invalid networks", () => {
			const result = validateNetwork("invalid");
			expect(result.valid).toBe(false);
		});

		it("should reject empty network", () => {
			const result = validateNetwork("");
			expect(result.valid).toBe(false);
		});
	});

	describe("validateSpendingLimit", () => {
		it("should accept positive numbers", () => {
			const result = validateSpendingLimit("100.50");
			expect(result.valid).toBe(true);
		});

		it("should reject negative numbers", () => {
			const result = validateSpendingLimit("-50");
			expect(result.valid).toBe(false);
		});

		it("should reject numbers with more than 2 decimals", () => {
			const result = validateSpendingLimit("100.999");
			expect(result.valid).toBe(false);
		});

		it("should reject non-numbers", () => {
			const result = validateSpendingLimit("abc");
			expect(result.valid).toBe(false);
		});
	});

	describe("validateEmail", () => {
		it("should accept valid emails", () => {
			const result = validateEmail("user@example.com");
			expect(result.valid).toBe(true);
		});

		it("should reject invalid emails", () => {
			const result = validateEmail("invalid-email");
			expect(result.valid).toBe(false);
		});

		it("should reject empty emails", () => {
			const result = validateEmail("");
			expect(result.valid).toBe(false);
		});
	});

	describe("validateRecoveryCode", () => {
		it("should accept valid codes", () => {
			const result = validateRecoveryCode("ABC123");
			expect(result.valid).toBe(true);
		});

		it("should reject codes under 6 characters", () => {
			const result = validateRecoveryCode("ABC12");
			expect(result.valid).toBe(false);
		});

		it("should reject codes over 12 characters", () => {
			const result = validateRecoveryCode("ABCDEF123456789");
			expect(result.valid).toBe(false);
		});

		it("should reject codes with special characters", () => {
			const result = validateRecoveryCode("ABC@#$");
			expect(result.valid).toBe(false);
		});
	});

	describe("validateNotInList", () => {
		it("should reject duplicates", () => {
			const result = validateNotInList("test@example.com", [
				"test@example.com",
			]);
			expect(result.valid).toBe(false);
		});

		it("should accept non-duplicates", () => {
			const result = validateNotInList("new@example.com", [
				"test@example.com",
			]);
			expect(result.valid).toBe(true);
		});

		it("should be case-insensitive", () => {
			const result = validateNotInList("TEST@EXAMPLE.COM", [
				"test@example.com",
			]);
			expect(result.valid).toBe(false);
		});
	});

	describe("validateRequired", () => {
		it("should reject empty values", () => {
			const result = validateRequired("");
			expect(result.valid).toBe(false);
		});

		it("should reject whitespace only", () => {
			const result = validateRequired("   ");
			expect(result.valid).toBe(false);
		});

		it("should accept non-empty values", () => {
			const result = validateRequired("value");
			expect(result.valid).toBe(true);
		});
	});
});
