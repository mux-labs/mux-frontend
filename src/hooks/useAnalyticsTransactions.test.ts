import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAnalyticsTransactions } from "./useAnalyticsTransactions";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/services/analyticsService", () => ({
	fetchExportTransactions: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
	default: vi.fn(() => ({})),
}));

vi.mock("@/mock-data/analytics", () => ({
	exportTransactions: [
		{
			id: "mock-tx-1",
			description: "Mock payout",
			date: "2025-05-28",
			humanDate: "May 28, 2025",
			category: "MW",
			status: "completed",
			amount: 250,
			currency: "XLM",
			type: "outgoing",
		},
	],
}));

const RANGE = { from: "2024-01-01", to: "2024-01-07" };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useAnalyticsTransactions", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "");
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
	});

	it("starts in a loading state", () => {
		const { result } = renderHook(() => useAnalyticsTransactions(RANGE));
		expect(result.current.isLoading).toBe(true);
		expect(result.current.transactions).toEqual([]);
		expect(result.current.isError).toBe(false);
		expect(result.current.isEmpty).toBe(false);
	});

	it("loads mock export transactions when no API URL is configured", async () => {
		const { result } = renderHook(() => useAnalyticsTransactions(RANGE));

		await waitFor(() => expect(result.current.status).toBe("success"));

		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
		expect(result.current.isEmpty).toBe(false);
		expect(result.current.transactions).toHaveLength(1);
		expect(result.current.transactions[0].description).toBe("Mock payout");
	});

	it("calls fetchExportTransactions when an API URL is configured", async () => {
		const { fetchExportTransactions } = await import(
			"@/services/analyticsService"
		);
		vi.mocked(fetchExportTransactions).mockResolvedValue([
			{
				id: "tx-1",
				description: "Backend tx",
				date: "2024-01-03",
				humanDate: "Jan 3, 2024",
				category: "MW",
				status: "completed" as const,
				amount: 100,
				currency: "XLM",
				type: "incoming" as const,
			},
		]);

		vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "https://api.muxprotocol.com");

		const { result } = renderHook(() => useAnalyticsTransactions(RANGE));

		await waitFor(() => expect(result.current.status).toBe("success"));

		expect(fetchExportTransactions).toHaveBeenCalledWith(
			expect.anything(),
			RANGE,
		);
		expect(result.current.transactions[0].description).toBe("Backend tx");
	});

	it("transitions to empty when the backend returns no transactions", async () => {
		const { fetchExportTransactions } = await import(
			"@/services/analyticsService"
		);
		vi.mocked(fetchExportTransactions).mockResolvedValue([]);

		vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "https://api.muxprotocol.com");

		const { result } = renderHook(() => useAnalyticsTransactions(RANGE));

		await waitFor(() => expect(result.current.status).toBe("empty"));

		expect(result.current.isEmpty).toBe(true);
		expect(result.current.transactions).toEqual([]);
	});

	it("re-fetches when the date range changes", async () => {
		const { fetchExportTransactions } = await import(
			"@/services/analyticsService"
		);
		vi.mocked(fetchExportTransactions).mockResolvedValue([]);

		vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "https://api.muxprotocol.com");

		const { result, rerender } = renderHook(
			({ range }) => useAnalyticsTransactions(range),
			{ initialProps: { range: RANGE } },
		);

		await waitFor(() => expect(result.current.status).toBe("empty"));
		expect(fetchExportTransactions).toHaveBeenCalledTimes(1);

		rerender({ range: { from: "2024-02-01", to: "2024-02-07" } });

		await waitFor(() =>
			expect(fetchExportTransactions).toHaveBeenCalledTimes(2),
		);
		expect(fetchExportTransactions).toHaveBeenLastCalledWith(
			expect.anything(),
			{
				from: "2024-02-01",
				to: "2024-02-07",
			},
		);
	});

	it("falls back to mock data when the API call fails (non-production)", async () => {
		const { fetchExportTransactions } = await import(
			"@/services/analyticsService"
		);
		vi.mocked(fetchExportTransactions).mockRejectedValue(new Error("API down"));

		vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "https://api.muxprotocol.com");

		const { result } = renderHook(() => useAnalyticsTransactions(RANGE));

		await waitFor(() => expect(result.current.status).toBe("success"));
		expect(result.current.isError).toBe(false);
		expect(result.current.transactions).toHaveLength(1);
	});

	it("surfaces an error in production with no backend instead of mock success", async () => {
		vi.stubEnv("NODE_ENV", "production");
		vi.stubEnv("NEXT_PUBLIC_API_URL", "");
		vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "");
		vi.stubEnv("NEXT_PUBLIC_API_BASE", "");

		const { result } = renderHook(() => useAnalyticsTransactions(RANGE));

		await waitFor(() => expect(result.current.status).toBe("error"));

		expect(result.current.isError).toBe(true);
		expect(result.current.transactions).toEqual([]);
		expect(result.current.error).toMatch(/NEXT_PUBLIC_API_URL is unset/i);
	});

	it("refetch re-triggers the load", async () => {
		const { result } = renderHook(() => useAnalyticsTransactions(RANGE));

		await waitFor(() => expect(result.current.status).toBe("success"));

		act(() => {
			result.current.refetch();
		});

		await waitFor(() => expect(result.current.isLoading).toBe(true));
		await waitFor(() => expect(result.current.status).toBe("success"));
	});
});
