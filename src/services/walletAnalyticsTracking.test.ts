import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackWalletEvent } from "./walletAnalyticsTracking";

describe("trackWalletEvent", () => {
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

		trackWalletEvent("wallet_detail_view", { walletId: "wallet-001" });

		expect(consoleSpy).toHaveBeenCalledTimes(1);
		expect(consoleSpy).toHaveBeenCalledWith("[Analytics] wallet_detail_view", {
			walletId: "wallet-001",
		});

		consoleSpy.mockRestore();
	});

	it("does not log in production environment", () => {
		process.env.NODE_ENV = "production";
		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		trackWalletEvent("wallet_detail_view", { walletId: "wallet-001" });

		expect(consoleSpy).not.toHaveBeenCalled();

		consoleSpy.mockRestore();
	});

	it("does not log in test environment", () => {
		process.env.NODE_ENV = "test";
		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		trackWalletEvent("wallet_balance_refresh", { walletId: "wallet-001" });

		expect(consoleSpy).not.toHaveBeenCalled();

		consoleSpy.mockRestore();
	});

	it("accepts all known event names without throwing", () => {
		const events: Array<{
			name: Parameters<typeof trackWalletEvent>[0];
			payload: Parameters<typeof trackWalletEvent>[1];
		}> = [
			{ name: "wallet_detail_view", payload: { walletId: "wallet-001" } },
			{ name: "wallet_balance_refresh", payload: { walletId: "wallet-001" } },
			{ name: "wallet_address_copied", payload: { walletId: "wallet-001" } },
			{ name: "wallet_send_opened", payload: { walletId: "wallet-001" } },
			{ name: "wallet_receive_opened", payload: { walletId: "wallet-001" } },
		];

		for (const { name, payload } of events) {
			expect(() => trackWalletEvent(name, payload)).not.toThrow();
		}
	});

	it("defaults payload to empty object when omitted", () => {
		process.env.NODE_ENV = "development";
		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		trackWalletEvent("wallet_detail_view");

		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] wallet_detail_view",
			{},
		);

		consoleSpy.mockRestore();
	});
});
