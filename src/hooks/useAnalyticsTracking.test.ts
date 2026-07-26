import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAnalyticsTracking } from "./useAnalyticsTracking";

describe("useAnalyticsTracking", () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleSpy.mockRestore();
	});

	it("fires a page_view event on mount", () => {
		renderHook(() => useAnalyticsTracking("analytics"));
		expect(consoleSpy).toHaveBeenCalledWith("[analytics]", "page_view", {
			page: "analytics",
		});
	});

	it("uses the provided page name in the page_view event", () => {
		renderHook(() => useAnalyticsTracking("wallets"));
		expect(consoleSpy).toHaveBeenCalledWith("[analytics]", "page_view", {
			page: "wallets",
		});
	});

	it("track() dispatches the event with properties", () => {
		const { result } = renderHook(() => useAnalyticsTracking("analytics"));
		result.current.track("date_range_changed", {
			from: "2024-01-01",
			to: "2024-01-07",
		});
		expect(consoleSpy).toHaveBeenCalledWith(
			"[analytics]",
			"date_range_changed",
			{ from: "2024-01-01", to: "2024-01-07" },
		);
	});

	it("track() dispatches the event with empty object when no properties given", () => {
		const { result } = renderHook(() => useAnalyticsTracking("analytics"));
		result.current.track("some_event");
		expect(consoleSpy).toHaveBeenCalledWith("[analytics]", "some_event", {});
	});

	it("only fires page_view once per mount", () => {
		const { rerender } = renderHook(() => useAnalyticsTracking("analytics"));
		rerender();
		rerender();
		const pageViewCalls = consoleSpy.mock.calls.filter(
			(c) => c[1] === "page_view",
		);
		expect(pageViewCalls).toHaveLength(1);
	});
});
