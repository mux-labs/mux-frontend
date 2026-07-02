import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNetworkAnalyticsTracking } from "../useNetworkAnalyticsTracking";

describe("useNetworkAnalyticsTracking", () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.stubEnv("NODE_ENV", "development");
		consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleSpy.mockRestore();
		vi.unstubAllEnvs();
	});

	it("fires a network_page_view event on mount", () => {
		renderHook(() => useNetworkAnalyticsTracking("mainnet"));
		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] network_page_view",
			{ network: "mainnet" },
		);
	});

	it("fires network_page_view with undefined network when none is provided", () => {
		renderHook(() => useNetworkAnalyticsTracking());
		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] network_page_view",
			{ network: undefined },
		);
	});

	it("track() dispatches an event with the current network attached", () => {
		const { result } = renderHook(() =>
			useNetworkAnalyticsTracking("testnet"),
		);
		consoleSpy.mockClear();

		result.current.track("network_switched", { from: "testnet", to: "mainnet" });

		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] network_switched",
			{ network: "testnet", from: "testnet", to: "mainnet" },
		);
	});

	it("track() works without an optional payload", () => {
		const { result } = renderHook(() =>
			useNetworkAnalyticsTracking("mainnet"),
		);
		consoleSpy.mockClear();

		result.current.track("stellar_explorer_opened");

		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] stellar_explorer_opened",
			{ network: "mainnet" },
		);
	});

	it("page_view fires only once even when the component re-renders", () => {
		const { rerender } = renderHook(
			({ network }: { network: string }) =>
				useNetworkAnalyticsTracking(network),
			{ initialProps: { network: "mainnet" } },
		);

		consoleSpy.mockClear();
		rerender({ network: "testnet" });

		// The page_view effect has no deps array items that change — it should
		// not re-fire on re-render.
		expect(
			consoleSpy.mock.calls.filter((c) =>
				String(c[0]).includes("network_page_view"),
			).length,
		).toBe(0);
	});
});
