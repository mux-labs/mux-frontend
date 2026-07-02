import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	trackSpendingLimitsEvent,
	type SpendingLimitsEventName,
	type SpendingLimitsEventPayload,
} from "./spendingLimitsTracking";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function captureConsoleLog() {
	return vi.spyOn(console, "log").mockImplementation(() => {});
}

// ---------------------------------------------------------------------------
// Development-mode logging (fires in all non-production envs including "test")
// ---------------------------------------------------------------------------

describe("trackSpendingLimitsEvent — non-production mode", () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		// Vitest sets NODE_ENV to "test" which is treated the same as non-production
		consoleSpy = captureConsoleLog();
	});

	afterEach(() => {
		consoleSpy.mockRestore();
	});

	it("logs the event name and empty payload when no payload is provided", () => {
		trackSpendingLimitsEvent("spending_limits_saved");
		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] spending_limits_saved",
			{},
		);
	});

	it("logs the event name and provided payload", () => {
		trackSpendingLimitsEvent("spending_limits_saved", {
			dailyLimit: 5000,
			transactionLimit: 1000,
		});
		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] spending_limits_saved",
			{ dailyLimit: 5000, transactionLimit: 1000 },
		);
	});

	it("logs spending_limits_save_failed with payload", () => {
		trackSpendingLimitsEvent("spending_limits_save_failed", {
			dailyLimit: 500,
			transactionLimit: 100,
		});
		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] spending_limits_save_failed",
			{ dailyLimit: 500, transactionLimit: 100 },
		);
	});

	it("logs spending_limits_loaded from api source", () => {
		trackSpendingLimitsEvent("spending_limits_loaded", {
			source: "api",
			dailyLimit: 5000,
			transactionLimit: 1000,
			todayUsage: 750,
		});
		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] spending_limits_loaded",
			{
				source: "api",
				dailyLimit: 5000,
				transactionLimit: 1000,
				todayUsage: 750,
			},
		);
	});

	it("logs spending_limits_loaded from localStorage source", () => {
		trackSpendingLimitsEvent("spending_limits_loaded", {
			source: "localStorage",
			dailyLimit: 3000,
			transactionLimit: 500,
		});
		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] spending_limits_loaded",
			{
				source: "localStorage",
				dailyLimit: 3000,
				transactionLimit: 500,
			},
		);
	});

	it("logs spending_limits_daily_changed with value", () => {
		trackSpendingLimitsEvent("spending_limits_daily_changed", {
			value: "8000",
		});
		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] spending_limits_daily_changed",
			{ value: "8000" },
		);
	});

	it("logs spending_limits_transaction_changed with value", () => {
		trackSpendingLimitsEvent("spending_limits_transaction_changed", {
			value: "2000",
		});
		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] spending_limits_transaction_changed",
			{ value: "2000" },
		);
	});

	it("logs spending_limits_validation_error with field and error message", () => {
		trackSpendingLimitsEvent("spending_limits_validation_error", {
			field: "dailyLimit",
			value: "-100",
			error: "Minimum is $1.",
		});
		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] spending_limits_validation_error",
			{ field: "dailyLimit", value: "-100", error: "Minimum is $1." },
		);
	});

	it("accepts an empty payload object explicitly", () => {
		const payload: SpendingLimitsEventPayload = {};
		trackSpendingLimitsEvent("spending_limits_saved", payload);
		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] spending_limits_saved",
			{},
		);
	});
});

// ---------------------------------------------------------------------------
// All event names are valid (type coverage smoke test)
// ---------------------------------------------------------------------------

describe("trackSpendingLimitsEvent — event name enumeration", () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleSpy = captureConsoleLog();
	});

	afterEach(() => {
		consoleSpy.mockRestore();
	});

	const eventNames: SpendingLimitsEventName[] = [
		"spending_limits_saved",
		"spending_limits_save_failed",
		"spending_limits_loaded",
		"spending_limits_daily_changed",
		"spending_limits_transaction_changed",
		"spending_limits_validation_error",
	];

	for (const name of eventNames) {
		it(`fires without throwing for event "${name}"`, () => {
			expect(() => trackSpendingLimitsEvent(name)).not.toThrow();
		});
	}
});

// ---------------------------------------------------------------------------
// Return value
// ---------------------------------------------------------------------------

describe("trackSpendingLimitsEvent — return value", () => {
	it("returns undefined (void)", () => {
		const spy = captureConsoleLog();
		const result = trackSpendingLimitsEvent("spending_limits_saved");
		expect(result).toBeUndefined();
		spy.mockRestore();
	});
});
