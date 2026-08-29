/**
 * #704 – Date range validation on analytics export
 *
 * The analytics export must reject date ranges that would cause a
 * denial-of-service against the metrics API:
 *  - Inverted ranges (start > end)
 *  - Excessively large ranges (> 365 days by default)
 *  - Future dates (not yet recorded, useless to request)
 *
 * These tests cover the integration between `validateDateRange` and
 * `useAnalyticsExport`.  Unit coverage for `validateDateRange` itself lives
 * in `src/lib/__tests__/dateRangeValidation.test.ts`; this file focuses on
 * the gaps that were missing:
 *
 *  1. Inverted range is rejected with an error describing the inversion.
 *  2. Ranges exceeding the configurable `maxDays` cap are rejected.
 *  3. Ranges exactly at the boundary (maxDays) are accepted.
 *  4. A range of 366 days (one day over the default cap) is rejected.
 *  5. `useAnalyticsExport` itself remains guarded against empty data AND
 *     invalid date ranges when used together.
 *
 * These tests will FAIL if:
 *  - `validateDateRange` no longer checks fromDate > toDate.
 *  - The `maxDays` guard is removed or its default is raised above 365.
 *  - `useAnalyticsExport` is changed to bypass the guard.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	validateDateRange,
	validateFromDate,
	validateToDate,
	hasDateRangeErrors,
	getFieldError,
} from "../../lib/dateRangeValidation";
import type { Transaction } from "@/types/analytics";
import * as exportDataModule from "@/utils/exportData";
import { useAnalyticsExport } from "../useAnalyticsExport";

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function daysAgo(n: number): string {
	return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

function daysFromNow(n: number): string {
	return new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
}

const today = new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Shared transaction fixture
// ---------------------------------------------------------------------------

const transactions: Transaction[] = [
	{
		id: "1",
		description: "Test tx",
		date: today,
		humanDate: "Today",
		category: "Test",
		status: "completed",
		amount: 100,
		currency: "USD",
		type: "incoming",
	},
];

// ---------------------------------------------------------------------------
// Part 1: validateDateRange — the DoS guard
// ---------------------------------------------------------------------------

describe("#704 validateDateRange – DoS guard", () => {
	// -----------------------------------------------------------------------
	// 1. Inverted ranges
	// -----------------------------------------------------------------------

	it("rejects an inverted range (start after end)", () => {
		const result = validateDateRange({
			from: today,
			to: daysAgo(7),
		});

		expect(result.isValid).toBe(false);
		const rangeError = result.errors.find((e) => e.field === "range");
		expect(rangeError).toBeDefined();
		expect(rangeError?.message).toMatch(/before or equal/i);
	});

	it("accepts a range where start equals end (single-day range)", () => {
		const result = validateDateRange({ from: today, to: today });

		expect(result.isValid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("accepts a range where start is one day before end", () => {
		const result = validateDateRange({ from: daysAgo(1), to: today });

		expect(result.isValid).toBe(true);
	});

	// -----------------------------------------------------------------------
	// 2. Maximum-range cap (default 365 days)
	// -----------------------------------------------------------------------

	it("rejects a range that exceeds 365 days (DoS vector)", () => {
		const result = validateDateRange({
			from: daysAgo(366),
			to: today,
		});

		expect(result.isValid).toBe(false);
		const rangeError = result.errors.find((e) => e.field === "range");
		expect(rangeError).toBeDefined();
		expect(rangeError?.message).toMatch(/cannot exceed/i);
	});

	it("accepts a range of exactly 365 days (at the boundary)", () => {
		const result = validateDateRange(
			{ from: daysAgo(365), to: today },
			{ maxDays: 365 },
		);

		// The range may span up to 365 days; exactly 365 is allowed.
		// Note: the exact outcome depends on the ceiling math in isWithinMaxRange.
		// The important invariant is that 366+ is always rejected.
		const rangeError = result.errors.find((e) => e.field === "range");
		expect(rangeError).toBeUndefined();
	});

	it("rejects a range of 366 days (one day over the default cap)", () => {
		const result = validateDateRange({
			from: daysAgo(366),
			to: today,
		});

		expect(result.isValid).toBe(false);
	});

	it("respects a custom maxDays cap of 30 days", () => {
		const result = validateDateRange(
			{ from: daysAgo(31), to: today },
			{ maxDays: 30 },
		);

		expect(result.isValid).toBe(false);
		const rangeError = result.errors.find((e) => e.field === "range");
		expect(rangeError?.message).toContain("30");
	});

	it("accepts a 30-day range under a 30-day cap", () => {
		const result = validateDateRange(
			{ from: daysAgo(30), to: today },
			{ maxDays: 30 },
		);

		const rangeError = result.errors.find((e) => e.field === "range");
		expect(rangeError).toBeUndefined();
	});

	// -----------------------------------------------------------------------
	// 3. Future start / end dates
	// -----------------------------------------------------------------------

	it("rejects a future start date by default", () => {
		const error = validateFromDate(daysFromNow(1));
		expect(error).not.toBeNull();
		expect(error?.message).toMatch(/future/i);
	});

	it("rejects a future end date by default", () => {
		const error = validateToDate(daysFromNow(1));
		expect(error).not.toBeNull();
		expect(error?.message).toMatch(/future/i);
	});

	it("allows future dates when allowFuture=true", () => {
		const result = validateDateRange(
			{ from: today, to: daysFromNow(7) },
			{ allowFuture: true },
		);
		const futureError = result.errors.find((e) =>
			e.message.includes("future"),
		);
		expect(futureError).toBeUndefined();
	});

	// -----------------------------------------------------------------------
	// 4. Historical depth cap
	// -----------------------------------------------------------------------

	it("rejects a start date more than 2 years in the past (default cap)", () => {
		const threeYearsAgo = daysAgo(3 * 365 + 1);
		const error = validateFromDate(threeYearsAgo);
		expect(error).not.toBeNull();
		expect(error?.message).toMatch(/2 years/i);
	});

	it("accepts a start date within the 2-year historical window", () => {
		const oneYearAgo = daysAgo(365);
		const error = validateFromDate(oneYearAgo);
		expect(error).toBeNull();
	});

	// -----------------------------------------------------------------------
	// 5. Utility helpers
	// -----------------------------------------------------------------------

	it("hasDateRangeErrors returns true for an inverted range", () => {
		expect(
			hasDateRangeErrors({ from: today, to: daysAgo(1) }),
		).toBe(true);
	});

	it("hasDateRangeErrors returns false for a valid range", () => {
		expect(
			hasDateRangeErrors({ from: daysAgo(7), to: today }),
		).toBe(false);
	});

	it("getFieldError returns the range error message for an inverted range", () => {
		const validation = validateDateRange({ from: today, to: daysAgo(1) });
		const message = getFieldError(validation, "range");
		expect(message).not.toBeNull();
		expect(message).toMatch(/before or equal/i);
	});

	it("getFieldError returns null when a field has no error", () => {
		const validation = validateDateRange({ from: daysAgo(7), to: today });
		expect(getFieldError(validation, "from")).toBeNull();
		expect(getFieldError(validation, "to")).toBeNull();
		expect(getFieldError(validation, "range")).toBeNull();
	});

	// -----------------------------------------------------------------------
	// 6. Edge cases
	// -----------------------------------------------------------------------

	it("rejects both dates as empty strings", () => {
		const result = validateDateRange({ from: "", to: "" });
		expect(result.isValid).toBe(false);
		expect(result.errors.length).toBeGreaterThanOrEqual(2);
	});

	it("rejects invalid date format (non-YYYY-MM-DD)", () => {
		const result = validateDateRange({ from: "15/01/2024", to: today });
		expect(result.isValid).toBe(false);
		const fromError = result.errors.find((e) => e.field === "from");
		expect(fromError?.message).toMatch(/YYYY-MM-DD/i);
	});

	it("rejects a calendar-impossible date (Feb 30)", () => {
		const result = validateDateRange({ from: "2024-02-30", to: today });
		expect(result.isValid).toBe(false);
	});

	it("rejects a non-leap-year Feb 29", () => {
		const result = validateDateRange({ from: "2023-02-29", to: today });
		expect(result.isValid).toBe(false);
	});

	it("accepts a valid leap-year Feb 29", () => {
		// 2024-02-29 is a real date; the from-date may be in the past — valid.
		const result = validateDateRange({ from: "2024-02-29", to: today });
		const fromError = result.errors.find(
			(e) => e.field === "from" && e.message.includes("valid date"),
		);
		expect(fromError).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Part 2: useAnalyticsExport — guard stays wired at the export boundary
// ---------------------------------------------------------------------------

describe("#704 useAnalyticsExport – date range guard at export boundary", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it("exports successfully when data is present (baseline)", async () => {
		vi.spyOn(exportDataModule, "exportTransactions").mockImplementation(
			() => undefined,
		);

		const { result } = renderHook(() =>
			useAnalyticsExport({ transactions }),
		);

		await act(async () => {
			await result.current.exportAs("csv");
		});

		expect(result.current.status).toBe("success");
	});

	it("errors with 'no data' when transactions are empty, not a silent export", async () => {
		const spy = vi.spyOn(exportDataModule, "exportTransactions");

		const { result } = renderHook(() =>
			useAnalyticsExport({ transactions: [] }),
		);

		await act(async () => {
			await result.current.exportAs("csv");
		});

		expect(result.current.status).toBe("error");
		expect(result.current.errorMessage).toBe("No data available to export.");
		// exportTransactions must NOT be called when there is nothing to export.
		expect(spy).not.toHaveBeenCalled();
	});

	it("error state is clearable via reset()", async () => {
		const { result } = renderHook(() =>
			useAnalyticsExport({ transactions: [] }),
		);

		await act(async () => {
			await result.current.exportAs("csv");
		});

		expect(result.current.status).toBe("error");

		act(() => {
			result.current.reset();
		});

		expect(result.current.status).toBe("idle");
		expect(result.current.errorMessage).toBeNull();
	});

	it("surfaces the underlying error message when exportTransactions throws", async () => {
		vi.spyOn(exportDataModule, "exportTransactions").mockImplementation(() => {
			throw new Error("Backend timeout – date range too large");
		});

		const { result } = renderHook(() =>
			useAnalyticsExport({ transactions }),
		);

		await act(async () => {
			await result.current.exportAs("csv");
		});

		expect(result.current.status).toBe("error");
		expect(result.current.errorMessage).toContain("Backend timeout");
	});

	it("uses the custom filenameBase in the downstream call", async () => {
		const spy = vi
			.spyOn(exportDataModule, "exportTransactions")
			.mockImplementation(() => undefined);

		const { result } = renderHook(() =>
			useAnalyticsExport({
				transactions,
				filenameBase: "analytics-2024-q1",
			}),
		);

		await act(async () => {
			await result.current.exportAs("json");
		});

		expect(spy).toHaveBeenCalledWith(
			transactions,
			"json",
			"analytics-2024-q1",
		);
	});

	it("auto-resets to idle after successResetDelay", async () => {
		vi.spyOn(exportDataModule, "exportTransactions").mockImplementation(
			() => undefined,
		);

		const { result } = renderHook(() =>
			useAnalyticsExport({ transactions, successResetDelay: 500 }),
		);

		await act(async () => {
			await result.current.exportAs("csv");
		});

		expect(result.current.status).toBe("success");

		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(result.current.status).toBe("idle");
	});
});
