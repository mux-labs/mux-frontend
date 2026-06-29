import {
	getFieldError,
	hasDateRangeErrors,
	validateDateRange,
	validateFromDate,
	validateToDate,
} from "../dateRangeValidation";

describe("dateRangeValidation", () => {
	const today = new Date().toISOString().slice(0, 10);
	const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
	const lastWeek = new Date(Date.now() - 7 * 86400000)
		.toISOString()
		.slice(0, 10);
	const lastMonth = new Date(Date.now() - 30 * 86400000)
		.toISOString()
		.slice(0, 10);
	const threeYearsAgo = new Date(Date.now() - 3 * 365 * 86400000)
		.toISOString()
		.slice(0, 10);
	const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

	describe("validateFromDate", () => {
		it("should return null for valid from date", () => {
			const error = validateFromDate(lastWeek);
			expect(error).toBeNull();
		});

		it("should return error for empty from date", () => {
			const error = validateFromDate("");
			expect(error).not.toBeNull();
			expect(error?.field).toBe("from");
			expect(error?.message).toContain("required");
		});

		it("should return error for invalid date format", () => {
			const error = validateFromDate("2024/01/15");
			expect(error).not.toBeNull();
			expect(error?.message).toContain("YYYY-MM-DD");
		});

		it("should return error for future date by default", () => {
			const error = validateFromDate(tomorrow);
			expect(error).not.toBeNull();
			expect(error?.message).toContain("future");
		});

		it("should allow future date when allowFuture is true", () => {
			const error = validateFromDate(tomorrow, { allowFuture: true });
			expect(error).toBeNull();
		});

		it("should return error for date too far in past", () => {
			const error = validateFromDate(threeYearsAgo, { maxYearsBack: 2 });
			expect(error).not.toBeNull();
			expect(error?.message).toContain("2 years");
		});

		it("should allow date within historical limit", () => {
			const oneYearAgo = new Date(Date.now() - 365 * 86400000)
				.toISOString()
				.slice(0, 10);
			const error = validateFromDate(oneYearAgo, { maxYearsBack: 2 });
			expect(error).toBeNull();
		});

		it("should handle invalid date strings", () => {
			const error = validateFromDate("2024-02-31"); // Invalid date
			expect(error).not.toBeNull();
			expect(error?.message).toContain("valid date");
		});

		it("should handle non-string values", () => {
			const error = validateFromDate(null as any);
			expect(error).not.toBeNull();
		});
	});

	describe("validateToDate", () => {
		it("should return null for valid to date", () => {
			const error = validateToDate(today);
			expect(error).toBeNull();
		});

		it("should return error for empty to date", () => {
			const error = validateToDate("");
			expect(error).not.toBeNull();
			expect(error?.field).toBe("to");
			expect(error?.message).toContain("required");
		});

		it("should return error for invalid date format", () => {
			const error = validateToDate("15-01-2024");
			expect(error).not.toBeNull();
			expect(error?.message).toContain("YYYY-MM-DD");
		});

		it("should return error for future date by default", () => {
			const error = validateToDate(tomorrow);
			expect(error).not.toBeNull();
			expect(error?.message).toContain("future");
		});

		it("should allow future date when allowFuture is true", () => {
			const error = validateToDate(tomorrow, { allowFuture: true });
			expect(error).toBeNull();
		});

		it("should handle invalid date strings", () => {
			const error = validateToDate("2024-13-01"); // Invalid month
			expect(error).not.toBeNull();
		});
	});

	describe("validateDateRange", () => {
		it("should return valid for correct date range", () => {
			const validation = validateDateRange({
				from: lastWeek,
				to: today,
			});
			expect(validation.isValid).toBe(true);
			expect(validation.errors).toHaveLength(0);
		});

		it("should return error when from is after to", () => {
			const validation = validateDateRange({
				from: today,
				to: lastWeek,
			});
			expect(validation.isValid).toBe(false);
			expect(validation.errors).toHaveLength(1);
			expect(validation.errors[0].field).toBe("range");
			expect(validation.errors[0].message).toContain("before or equal");
		});

		it("should allow same from and to date", () => {
			const validation = validateDateRange({
				from: today,
				to: today,
			});
			expect(validation.isValid).toBe(true);
		});

		it("should return error when range exceeds max days", () => {
			const validation = validateDateRange(
				{
					from: lastMonth,
					to: today,
				},
				{ maxDays: 7 },
			);
			expect(validation.isValid).toBe(false);
			const rangeError = validation.errors.find((e) => e.field === "range");
			expect(rangeError?.message).toContain("cannot exceed");
		});

		it("should accumulate multiple errors", () => {
			const validation = validateDateRange({
				from: "",
				to: "",
			});
			expect(validation.isValid).toBe(false);
			expect(validation.errors.length).toBeGreaterThan(0);
		});

		it("should validate with allowFuture option", () => {
			const validation = validateDateRange(
				{
					from: today,
					to: tomorrow,
				},
				{ allowFuture: true },
			);
			expect(validation.isValid).toBe(true);
		});

		it("should validate with custom maxYearsBack", () => {
			const validation = validateDateRange(
				{
					from: threeYearsAgo,
					to: today,
				},
				{ maxYearsBack: 5 },
			);
			// Should pass if within 5 years, but might fail on max days
			const yearError = validation.errors.find((e) =>
				e.message.includes("years"),
			);
			expect(yearError).toBeUndefined();
		});

		it("should handle edge case of exactly max days", () => {
			const from = new Date(Date.now() - 365 * 86400000)
				.toISOString()
				.slice(0, 10);
			const validation = validateDateRange(
				{
					from,
					to: today,
				},
				{ maxDays: 365 },
			);
			expect(validation.isValid).toBe(true);
		});

		it("should not validate range if individual dates are invalid", () => {
			const validation = validateDateRange({
				from: "invalid",
				to: today,
			});
			expect(validation.isValid).toBe(false);
			// Should have error for from date, but not necessarily a range error
			const fromError = validation.errors.find((e) => e.field === "from");
			expect(fromError).toBeDefined();
		});
	});

	describe("getFieldError", () => {
		it("should return error message for specific field", () => {
			const validation = validateDateRange({
				from: "",
				to: today,
			});
			const error = getFieldError(validation, "from");
			expect(error).not.toBeNull();
			expect(error).toContain("required");
		});

		it("should return null when field has no error", () => {
			const validation = validateDateRange({
				from: lastWeek,
				to: today,
			});
			const error = getFieldError(validation, "from");
			expect(error).toBeNull();
		});

		it("should return range error when applicable", () => {
			const validation = validateDateRange({
				from: today,
				to: lastWeek,
			});
			const error = getFieldError(validation, "range");
			expect(error).not.toBeNull();
			expect(error).toContain("before");
		});
	});

	describe("hasDateRangeErrors", () => {
		it("should return false for valid range", () => {
			const hasErrors = hasDateRangeErrors({
				from: lastWeek,
				to: today,
			});
			expect(hasErrors).toBe(false);
		});

		it("should return true for invalid range", () => {
			const hasErrors = hasDateRangeErrors({
				from: today,
				to: lastWeek,
			});
			expect(hasErrors).toBe(true);
		});

		it("should respect options parameter", () => {
			const hasErrors = hasDateRangeErrors(
				{
					from: lastMonth,
					to: today,
				},
				{ maxDays: 7 },
			);
			expect(hasErrors).toBe(true);
		});
	});

	describe("edge cases", () => {
		it("should handle leap year dates", () => {
			const validation = validateDateRange({
				from: "2024-02-29", // Valid leap year date
				to: today,
			});
			const fromError = validation.errors.find((e) => e.field === "from");
			// Should not have a "valid date" error (might have future/past errors)
			if (fromError) {
				expect(fromError.message).not.toContain("valid date");
			}
		});

		it("should handle invalid leap year dates", () => {
			const validation = validateDateRange({
				from: "2023-02-29", // Invalid - 2023 is not a leap year
				to: today,
			});
			const fromError = validation.errors.find((e) => e.field === "from");
			expect(fromError).toBeDefined();
		});

		it("should handle boundary dates correctly", () => {
			const validation = validateDateRange({
				from: yesterday,
				to: today,
			});
			expect(validation.isValid).toBe(true);
		});

		it("should handle single day range", () => {
			const validation = validateDateRange({
				from: today,
				to: today,
			});
			expect(validation.isValid).toBe(true);
		});

		it("should handle whitespace in dates", () => {
			const validation = validateDateRange({
				from: "  ",
				to: today,
			});
			expect(validation.isValid).toBe(false);
			const fromError = validation.errors.find((e) => e.field === "from");
			expect(fromError).toBeDefined();
		});
	});
});
