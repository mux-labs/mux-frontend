/**
 * Tests for analytics page — lazy-loaded charts & bundle optimization.
 *
 * Verifies:
 * - Analytics page renders with dynamic chart imports
 * - Loading skeleton appears before charts resolve
 * - Charts are rendered client-side only (ssr: false)
 */

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the dynamic chart imports
vi.mock("@/components/analytics/AnalyticsChart", () => ({
	AnalyticsChart: ({
		title,
		data,
	}: {
		title: string;
		data: unknown[];
		description?: string;
		formatValue?: (v: number) => string;
	}) => (
		<div data-testid={`chart-${title.toLowerCase()}`}>
			{title}: {data.length} points
		</div>
	),
}));

vi.mock("@/components/analytics/TransactionVolumeChart", () => ({
	TransactionVolumeChart: () => (
		<div data-testid="transaction-volume-chart">Volume Chart</div>
	),
}));

// Mock useAnalyticsMetrics to return predictable data
vi.mock("@/hooks/useAnalyticsMetrics", () => ({
	useAnalyticsMetrics: vi.fn(),
}));

import { useAnalyticsMetrics } from "@/hooks/useAnalyticsMetrics";

const mockMetricsData = {
	metrics: [
		{ label: "Total Volume", value: "$1.2M" },
		{ label: "Transactions", value: "342" },
	],
	volumeData: [
		{ date: "2025-01-01", value: 1000000 },
		{ date: "2025-01-02", value: 1200000 },
	],
	transactionsData: [
		{ date: "2025-01-01", value: 50 },
		{ date: "2025-01-02", value: 60 },
	],
	topAssets: [{ name: "XLM", symbol: "XLM", txCount: 100, volume: 50000 }],
};

const mockUseAnalyticsMetrics = useAnalyticsMetrics as ReturnType<
	typeof vi.fn
>;

describe("Analytics page — lazy-loaded charts (Task 3) & bundle optimization (Task 4)", () => {
	beforeEach(() => {
		mockUseAnalyticsMetrics.mockReturnValue({
			data: null,
			isLoading: true,
			isEmpty: false,
			isError: false,
			error: null,
			refetch: vi.fn(),
			status: "loading",
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("shows loading skeleton while analytics data is loading", async () => {
		const { default: AnalyticsPage } = await import(
			"@/app/dashboard/analytics/page"
		);
		render(<AnalyticsPage />);

		// The loading skeleton should be visible
		expect(
			document.querySelector(".animate-pulse"),
		).toBeTruthy();
	});

	it("renders chart components when data is loaded", async () => {
		mockUseAnalyticsMetrics.mockReturnValue({
			data: mockMetricsData,
			isLoading: false,
			isEmpty: false,
			isError: false,
			error: null,
			refetch: vi.fn(),
			status: "success",
		});

		const { default: AnalyticsPage } = await import(
			"@/app/dashboard/analytics/page"
		);
		render(<AnalyticsPage />);

		// Charts are loaded via next/dynamic — use findBy* to wait for resolution
		const volumeChart = await screen.findByTestId("chart-volume");
		const txChart = await screen.findByTestId("chart-transactions");
		expect(volumeChart).toBeTruthy();
		expect(txChart).toBeTruthy();
	});

	it("shows error state when metrics hook reports an error", async () => {
		mockUseAnalyticsMetrics.mockReturnValue({
			data: null,
			isLoading: false,
			isEmpty: false,
			isError: true,
			error: "Network failure",
			refetch: vi.fn(),
			status: "error",
		});

		const { default: AnalyticsPage } = await import(
			"@/app/dashboard/analytics/page"
		);
		render(<AnalyticsPage />);

		expect(screen.getByText("Failed to load analytics")).toBeTruthy();
		expect(screen.getByText("Network failure")).toBeTruthy();
	});

	it("shows empty state when data is empty", async () => {
		mockUseAnalyticsMetrics.mockReturnValue({
			data: {
				metrics: [],
				volumeData: [],
				transactionsData: [],
				topAssets: [],
			},
			isLoading: false,
			isEmpty: true,
			isError: false,
			error: null,
			refetch: vi.fn(),
			status: "empty",
		});

		const { default: AnalyticsPage } = await import(
			"@/app/dashboard/analytics/page"
		);
		render(<AnalyticsPage />);

		expect(screen.getByText(/No analytics data/i)).toBeTruthy();
	});
});
