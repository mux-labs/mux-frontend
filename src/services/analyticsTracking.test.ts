import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackTransactionEvent } from "./analyticsTracking";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("trackTransactionEvent", () => {
	const originalEnv = process.env.NODE_ENV;

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		process.env.NODE_ENV = originalEnv;
	});

	it("logs to console in development environment", () => {
		process.env.NODE_ENV = "development";
		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		trackTransactionEvent("transactions_view", { address: "G…test" });

		expect(consoleSpy).toHaveBeenCalledTimes(1);
		expect(consoleSpy).toHaveBeenCalledWith("[Analytics] transactions_view", {
			address: "G…test",
		});

		consoleSpy.mockRestore();
	});

	it("does not log in production environment", () => {
		process.env.NODE_ENV = "production";
		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		trackTransactionEvent("transactions_view", { address: "G…test" });

		expect(consoleSpy).not.toHaveBeenCalled();

		consoleSpy.mockRestore();
	});

	it("does not log in test environment", () => {
		process.env.NODE_ENV = "test";
		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		trackTransactionEvent("transactions_sort", {
			key: "amount",
			direction: "asc",
		});

		expect(consoleSpy).not.toHaveBeenCalled();

		consoleSpy.mockRestore();
	});

	it("accepts all known event names without throwing", () => {
		const events: Array<{
			name: Parameters<typeof trackTransactionEvent>[0];
			payload: Parameters<typeof trackTransactionEvent>[1];
		}> = [
			{ name: "transactions_view", payload: { address: "G…" } },
			{
				name: "transactions_sort",
				payload: { key: "createdAt", direction: "desc" },
			},
			{
				name: "transactions_filter_changed",
				payload: { type: "status", value: "completed" },
			},
			{ name: "transactions_filters_cleared", payload: {} },
			{ name: "transactions_page_change", payload: { page: 2 } },
			{ name: "transactions_items_per_page", payload: { itemsPerPage: 10 } },
			{ name: "transaction_row_click", payload: { hash: "abc123" } },
		];

		for (const { name, payload } of events) {
			expect(() => trackTransactionEvent(name, payload)).not.toThrow();
		}
	});

	it("defaults payload to empty object when omitted", () => {
		process.env.NODE_ENV = "development";
		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		trackTransactionEvent("transactions_view");

		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] transactions_view",
			{},
		);

		consoleSpy.mockRestore();
	});
});
