import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackNetworkEvent } from "../networkAnalyticsTracking";

describe("trackNetworkEvent", () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleSpy.mockRestore();
		vi.unstubAllEnvs();
	});

	it("logs to console in development", () => {
		vi.stubEnv("NODE_ENV", "development");
		trackNetworkEvent("network_switched", { from: "mainnet", to: "testnet" });
		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] network_switched",
			{ from: "mainnet", to: "testnet" },
		);
	});

	it("does not log to console in production", () => {
		vi.stubEnv("NODE_ENV", "production");
		trackNetworkEvent("network_switched", { from: "mainnet", to: "testnet" });
		expect(consoleSpy).not.toHaveBeenCalled();
	});

	it("uses an empty payload by default", () => {
		vi.stubEnv("NODE_ENV", "development");
		trackNetworkEvent("network_page_view");
		expect(consoleSpy).toHaveBeenCalledWith("[Analytics] network_page_view", {});
	});

	it("passes arbitrary payload keys through", () => {
		vi.stubEnv("NODE_ENV", "development");
		trackNetworkEvent("stellar_address_viewed", {
			address: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
			network: "testnet",
		});
		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] stellar_address_viewed",
			{
				address: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
				network: "testnet",
			},
		);
	});

	it("handles all defined event names without throwing", () => {
		vi.stubEnv("NODE_ENV", "development");
		const events = [
			"network_page_view",
			"network_switched",
			"network_filter_applied",
			"network_filter_cleared",
			"stellar_address_viewed",
			"stellar_explorer_opened",
			"stellar_testnet_funded",
		] as const;

		for (const event of events) {
			expect(() => trackNetworkEvent(event)).not.toThrow();
		}
		expect(consoleSpy).toHaveBeenCalledTimes(events.length);
	});

	it("returns void", () => {
		vi.stubEnv("NODE_ENV", "development");
		const result = trackNetworkEvent("network_page_view");
		expect(result).toBeUndefined();
	});
});
