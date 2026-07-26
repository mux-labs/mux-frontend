"use client";

import type { DateRange } from "@/components/analytics/DateRangePicker";

/**
 * Validation result for a date range field.
 */
export interface DateRangeFieldError {
	/** The field name that has the error */
	field: "from" | "to" | "range";
	/** Human-readable error message */
	message: string;
}

/**
 * Result of validating a date range.
 */
export interface DateRangeValidation {
	/** Whether the date range is valid */
	isValid: boolean;
	/** Array of field-level errors, empty when valid */
	errors: DateRangeFieldError[];
}

/**
 * Parses a date string (YYYY-MM-DD) and returns a Date object or null if invalid.
 * Also validates that the parsed date matches the input string.
 */
function parseDate(dateStr: string): Date | null {
	if (!dateStr || typeof dateStr !== "string") return null;
	
	// Check format first
	if (!isValidDateFormat(dateStr)) return null;
	
	const parsed = new Date(dateStr);
	if (Number.isNaN(parsed.getTime())) return null;
	
	// Verify the parsed date matches the input (catches invalid dates like 2024-02-31)
	const [year, month, day] = dateStr.split("-").map(Number);
	if (
		parsed.getFullYear() !== year ||
		parsed.getMonth() + 1 !== month ||
		parsed.getDate() !== day
	) {
		return null;
	}
	
	return parsed;
}

/**
 * Validates that a date string is in YYYY-MM-DD format.
 */
function isValidDateFormat(dateStr: string): boolean {
	if (!dateStr || typeof dateStr !== "string") return false;
	const regex = /^\d{4}-\d{2}-\d{2}$/;
	return regex.test(dateStr);
}

/**
 * Validates that a date is not in the future.
 */
function isNotFuture(dateStr: string): boolean {
	const date = parseDate(dateStr);
	if (!date) return false;
	const today = new Date();
	today.setHours(23, 59, 59, 999); // End of today
	return date <= today;
}

/**
 * Validates that a date is not too far in the past.
 * By default, limits to 2 years in the past.
 */
function isWithinHistoricalLimit(
	dateStr: string,
	maxYearsBack = 2,
): boolean {
	const date = parseDate(dateStr);
	if (!date) return false;
	const limit = new Date();
	limit.setFullYear(limit.getFullYear() - maxYearsBack);
	return date >= limit;
}

/**
 * Validates that the date range is not too long.
 * By default, limits to 365 days.
 */
function isWithinMaxRange(from: string, to: string, maxDays = 365): boolean {
	const fromDate = parseDate(from);
	const toDate = parseDate(to);
	if (!fromDate || !toDate) return false;

	const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	return diffDays <= maxDays;
}

/**
 * Validates the "from" date in a date range.
 *
 * @param value - The "from" date string (YYYY-MM-DD).
 * @param options - Optional validation options.
 * @returns A DateRangeFieldError if validation fails, or null if valid.
 */
export function validateFromDate(
	value: string,
	options: {
		allowFuture?: boolean;
		maxYearsBack?: number;
	} = {},
): DateRangeFieldError | null {
	const { allowFuture = false, maxYearsBack = 2 } = options;

	if (!value || value.trim() === "") {
		return { field: "from", message: "Start date is required" };
	}

	if (!isValidDateFormat(value)) {
		return {
			field: "from",
			message: "Start date must be in YYYY-MM-DD format",
		};
	}

	const date = parseDate(value);
	if (!date) {
		return { field: "from", message: "Start date is not a valid date" };
	}

	if (!allowFuture && !isNotFuture(value)) {
		return { field: "from", message: "Start date cannot be in the future" };
	}

	if (!isWithinHistoricalLimit(value, maxYearsBack)) {
		return {
			field: "from",
			message: `Start date cannot be more than ${maxYearsBack} years in the past`,
		};
	}

	return null;
}

/**
 * Validates the "to" date in a date range.
 *
 * @param value - The "to" date string (YYYY-MM-DD).
 * @param options - Optional validation options.
 * @returns A DateRangeFieldError if validation fails, or null if valid.
 */
export function validateToDate(
	value: string,
	options: {
		allowFuture?: boolean;
	} = {},
): DateRangeFieldError | null {
	const { allowFuture = false } = options;

	if (!value || value.trim() === "") {
		return { field: "to", message: "End date is required" };
	}

	if (!isValidDateFormat(value)) {
		return { field: "to", message: "End date must be in YYYY-MM-DD format" };
	}

	const date = parseDate(value);
	if (!date) {
		return { field: "to", message: "End date is not a valid date" };
	}

	if (!allowFuture && !isNotFuture(value)) {
		return { field: "to", message: "End date cannot be in the future" };
	}

	return null;
}

/**
 * Validates a complete date range.
 *
 * @param range - The date range to validate.
 * @param options - Optional validation options.
 * @returns A DateRangeValidation with the combined results.
 */
export function validateDateRange(
	range: DateRange,
	options: {
		allowFuture?: boolean;
		maxYearsBack?: number;
		maxDays?: number;
	} = {},
): DateRangeValidation {
	const { allowFuture = false, maxYearsBack = 2, maxDays = 365 } = options;
	const errors: DateRangeFieldError[] = [];

	// Validate individual dates
	const fromError = validateFromDate(range.from, { allowFuture, maxYearsBack });
	if (fromError) errors.push(fromError);

	const toError = validateToDate(range.to, { allowFuture });
	if (toError) errors.push(toError);

	// If individual dates are valid, validate the range relationship
	if (!fromError && !toError) {
		const fromDate = parseDate(range.from);
		const toDate = parseDate(range.to);

		if (fromDate && toDate) {
			if (fromDate > toDate) {
				errors.push({
					field: "range",
					message: "Start date must be before or equal to end date",
				});
			}

			if (!isWithinMaxRange(range.from, range.to, maxDays)) {
				errors.push({
					field: "range",
					message: `Date range cannot exceed ${maxDays} days`,
				});
			}
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Gets a specific error message for a field from validation results.
 *
 * @param validation - The validation result.
 * @param field - The field name to get error for.
 * @returns The error message or null if no error for that field.
 */
export function getFieldError(
	validation: DateRangeValidation,
	field: "from" | "to" | "range",
): string | null {
	const error = validation.errors.find((e) => e.field === field);
	return error ? error.message : null;
}

/**
 * Checks if a date range has any validation errors.
 *
 * @param range - The date range to check.
 * @param options - Optional validation options.
 * @returns True if the range has errors, false otherwise.
 */
export function hasDateRangeErrors(
	range: DateRange,
	options?: Parameters<typeof validateDateRange>[1],
): boolean {
	const validation = validateDateRange(range, options);
	return !validation.isValid;
}
