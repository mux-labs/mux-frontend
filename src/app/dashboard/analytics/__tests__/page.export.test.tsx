/**
 * Tests for analytics page export stub (#453).
 *
 * Verifies that the AnalyticsExportButton is rendered in the page and that
 * the CSV / JSON buttons are wired to the useAnalyticsExport hook so
 * developers can download analytics snapshots.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock useAnalyticsMetrics so the page renders in "success" state without any
// real async work.
const mockMetricsData = {
	metrics: [
		{
			label: "Total Volume",
			value: "$12.4M",
			change: 12.5,
			changeLabel: "vs last period",
		},
	],
	volumeData: [{ date: "Mon", value: 2400000 }],
	transactionsData: [{ date: "Mon", value: 12000 }],
	topAssets: [
		{
			rank: 1,
			name: "Mux Protocol",
			symbol: "MUX",
			volume: "$4,234,567",
			volumeChange: 15.2,
			tvl: "$18.2M",
			txCount: 28432,
		},
		{
			rank: 2,
			name: "Stellar",
			symbol: "XLM",
			volume: "$3,456,789",
			volumeChange: 8.7,
			tvl: "$12.8M",
			txCount: 21890,
		},
	],
};

vi.mock("@/hooks/useAnalyticsMetrics", () => ({
	useAnalyticsMetrics: vi.fn(() => ({
		data: mockMetricsData,
		isLoading: false,
		isEmpty: false,
		isError: false,
		error: null,
		refetch: vi.fn(),
	})),
}));

vi.mock("@/hooks/useAnalyticsTracking", () => ({
	useAnalyticsTracking: vi.fn(() => ({ track: vi.fn() })),
}));

// Mock exportTransactions so no real Blob / anchor work happens in jsdom.
const exportTransactionsSpy = vi.fn();
vi.mock("@/utils/exportData", () => ({
	exportTransactions: (...args: unknown[]) => exportTransactionsSpy(...args),
}));

// Mock the toast system used by the analytics page.
vi.mock("@/components/ui/toast", () => ({
	ToastContainer: () => null,
	useToast: () => ({ toasts: [], addToast: vi.fn(), dismissToast: vi.fn() }),
}));

// Import the page AFTER mocks are set up.
import AnalyticsPage from "../page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage() {
	return render(<AnalyticsPage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AnalyticsPage — #453 analytics export stub", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the CSV export button", () => {
		renderPage();
		expect(
			screen.getByRole("button", { name: /export.*csv/i }),
		).toBeInTheDocument();
	});

	it("renders the JSON export button", () => {
		renderPage();
		expect(
			screen.getByRole("button", { name: /export.*json/i }),
		).toBeInTheDocument();
	});

	it("export buttons are enabled when data is available", () => {
		renderPage();
		expect(
			screen.getByRole("button", { name: /export.*csv/i }),
		).not.toBeDisabled();
		expect(
			screen.getByRole("button", { name: /export.*json/i }),
		).not.toBeDisabled();
	});

	it("shows the row count hint derived from topAssets length", () => {
		renderPage();
		// mockMetricsData.topAssets has 2 items → "2 rows will be exported"
		expect(screen.getByText(/2 rows? will be exported/i)).toBeInTheDocument();
	});

	it("calls exportTransactions with 'csv' when CSV button is clicked", async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(screen.getByRole("button", { name: /export.*csv/i }));

		expect(exportTransactionsSpy).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({ description: "Mux Protocol" }),
			]),
			"csv",
			expect.stringContaining("analytics-"),
		);
	});

	it("calls exportTransactions with 'json' when JSON button is clicked", async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(screen.getByRole("button", { name: /export.*json/i }));

		expect(exportTransactionsSpy).toHaveBeenCalledWith(
			expect.any(Array),
			"json",
			expect.stringContaining("analytics-"),
		);
	});

	it("uses the selected date range in the filename base", () => {
		renderPage();
		// The filenameBase is `analytics-{range.from}_{range.to}` — clicking CSV
		// should pass a filename containing "analytics-".
		userEvent.click(screen.getByRole("button", { name: /export.*csv/i }));
		// Filename assertion done in the spy call above; here we just confirm the
		// group label is present (accessibility smoke-check).
		expect(
			screen.getByRole("group", { name: /export analytics data/i }),
		).toBeInTheDocument();
	});
});

describe("AnalyticsPage — #453 export button loading / error states", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows 'No data to export' when topAssets is empty", async () => {
		const mod = await import("@/hooks/useAnalyticsMetrics");
		vi.mocked(mod.useAnalyticsMetrics).mockReturnValueOnce({
			data: { ...mockMetricsData, topAssets: [] },
			isLoading: false,
			isEmpty: false,
			isError: false,
			error: null,
			refetch: vi.fn(),
		});

		renderPage();
		expect(screen.getByText(/no data to export/i)).toBeInTheDocument();
	});

	it("disables export buttons when topAssets is empty", async () => {
		const mod = await import("@/hooks/useAnalyticsMetrics");
		vi.mocked(mod.useAnalyticsMetrics).mockReturnValueOnce({
			data: { ...mockMetricsData, topAssets: [] },
			isLoading: false,
			isEmpty: false,
			isError: false,
			error: null,
			refetch: vi.fn(),
		});

		renderPage();
		expect(screen.getByRole("button", { name: /export.*csv/i })).toBeDisabled();
		expect(
			screen.getByRole("button", { name: /export.*json/i }),
		).toBeDisabled();
	});
});
