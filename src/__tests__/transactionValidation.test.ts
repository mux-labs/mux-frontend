import {
	validateAmount,
	validateAddress,
	validateMemo,
	validateTransactionForm,
} from "@/lib/transactionValidation";

describe("validateAmount", () => {
	it("returns error for empty string", () => {
		expect(validateAmount("")).toEqual({
			field: "amount",
			message: "Amount is required",
		});
	});

	it("returns error for whitespace-only string", () => {
		expect(validateAmount("   ")).toEqual({
			field: "amount",
			message: "Amount is required",
		});
	});

	it("returns error for non-numeric string", () => {
		expect(validateAmount("abc")).toEqual({
			field: "amount",
			message: "Amount must be a valid number",
		});
	});

	it("returns error for zero", () => {
		expect(validateAmount("0")).toEqual({
			field: "amount",
			message: "Amount must be greater than 0",
		});
	});

	it("returns error for negative number", () => {
		expect(validateAmount("-5")).toEqual({
			field: "amount",
			message: "Amount must be greater than 0",
		});
	});

	it("returns error for more than 6 decimal places", () => {
		expect(validateAmount("1.1234567")).toEqual({
			field: "amount",
			message: "Amount can have at most 6 decimal places",
		});
	});

	it("returns null for valid positive integer", () => {
		expect(validateAmount("42")).toBeNull();
	});

	it("returns null for valid decimal with 6 places", () => {
		expect(validateAmount("1.123456")).toBeNull();
	});

	it("returns null for valid decimal with fewer places", () => {
		expect(validateAmount("10.5")).toBeNull();
	});

	it("trims whitespace before validating", () => {
		expect(validateAmount("  100  ")).toBeNull();
	});
});

describe("validateAddress", () => {
	it("returns error for empty string", () => {
		expect(validateAddress("")).toEqual({
			field: "address",
			message: "Address is required",
		});
	});

	it("returns error for whitespace-only string", () => {
		expect(validateAddress("   ")).toEqual({
			field: "address",
			message: "Address is required",
		});
	});

	it("returns error for too short string", () => {
		expect(validateAddress("abc")).toEqual({
			field: "address",
			message: "Invalid address format (must be 32-44 alphanumeric characters)",
		});
	});

	it("returns error for invalid characters", () => {
		expect(validateAddress("a".repeat(32) + "!@#")).toEqual({
			field: "address",
			message: "Invalid address format (must be 32-44 alphanumeric characters)",
		});
	});

	it("returns null for valid 32-char address", () => {
		expect(validateAddress("a".repeat(32))).toBeNull();
	});

	it("returns null for valid 44-char address", () => {
		expect(validateAddress("a".repeat(44))).toBeNull();
	});

	it("returns null for valid address with 0x prefix", () => {
		expect(validateAddress("0x" + "a".repeat(42))).toBeNull();
	});
});

describe("validateMemo", () => {
	it("returns null for empty string (optional)", () => {
		expect(validateMemo("")).toBeNull();
	});

	it("returns null for whitespace-only string (optional)", () => {
		expect(validateMemo("   ")).toBeNull();
	});

	it("returns null for valid short memo", () => {
		expect(validateMemo("Payment for services")).toBeNull();
	});

	it("returns null for exactly 500 chars", () => {
		expect(validateMemo("a".repeat(500))).toBeNull();
	});

	it("returns error for more than 500 chars", () => {
		expect(validateMemo("a".repeat(501))).toEqual({
			field: "memo",
			message: "Memo must be at most 500 characters",
		});
	});
});

describe("validateTransactionForm", () => {
	it("returns valid result when all fields are valid", () => {
		const result = validateTransactionForm({
			amount: "100",
			address: "a".repeat(40),
			memo: "test",
		});
		expect(result.isValid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("returns invalid result when amount is invalid", () => {
		const result = validateTransactionForm({
			amount: "",
			address: "a".repeat(40),
		});
		expect(result.isValid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].field).toBe("amount");
	});

	it("returns multiple errors when multiple fields are invalid", () => {
		const result = validateTransactionForm({
			amount: "",
			address: "",
		});
		expect(result.isValid).toBe(false);
		expect(result.errors).toHaveLength(2);
	});

	it("handles optional memo field", () => {
		const result = validateTransactionForm({
			amount: "50",
			address: "a".repeat(35),
		});
		expect(result.isValid).toBe(true);
	});
});
