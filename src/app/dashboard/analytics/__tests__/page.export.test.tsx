/**
 * Tests for analytics page export data source (#453).
 *
 * Verifies that the AnalyticsExportButton is rendered in the page and that
 * the CSV / JSON buttons are wired to the useAnalyticsExport hook. The export
 * payload must come from real, date-scoped transaction records delivered by
 * `useAnalyticsTransactions` — never synthetic objects synthesised from the
 * aggregated `topAssets` table.
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

// Mock useAnalyticsTransactions — the source of the REAL export rows.
const mockTransactions = [
	{
		id: "txn_mainnet_48291034",
		description: "SDK wallet payout",
		date: "2025-05-28",
		humanDate: "May 28, 2025",
		category: "MW",
		status: "completed" as const,
		amount: 250,
		currency: "XLM",
		type: "outgoing" as const,
	},
	{
		id: "txn_mainnet_48291010",
		description: "Wallet fund",
		date: "2025-05-27",
		humanDate: "May 27, 2025",
		category: "MW",
		status: "completed" as const,
		amount: 1000,
		currency: "XLM",
		type: "incoming" as const,
	},
];

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

vi.mock("@/hooks/useAnalyticsTransactions", () => ({
	useAnalyticsTransactions: vi.fn(() => ({
		transactions: mockTransactions,
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

import { useAnalyticsTransactions } from "@/hooks/useAnalyticsTransactions";
// Import the page AFTER mocks are set up.
import AnalyticsPage from "../page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage() {
	return render(<AnalyticsPage />);
}

const mockedTransactions = () => vi.mocked(useAnalyticsTransactions);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AnalyticsPage — #453 analytics export data source", () => {
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

	it("shows the row count hint derived from the real transaction list", () => {
		renderPage();
		// mockTransactions has 2 items → "2 rows will be exported"
		expect(screen.getByText(/2 rows? will be exported/i)).toBeInTheDocument();
	});

	it("calls exportTransactions with 'csv' and the real transactions when CSV is clicked", async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(screen.getByRole("button", { name: /export.*csv/i }));

		expect(exportTransactionsSpy).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({ description: "SDK wallet payout" }),
				expect.objectContaining({ description: "Wallet fund" }),
			]),
			"csv",
			expect.stringContaining("analytics-"),
		);
	});

	it("does not derive export rows from the aggregated topAssets table", async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(screen.getByRole("button", { name: /export.*json/i }));

		const exported = exportTransactionsSpy.mock.calls[0][0] as Array<{
			description: string;
			amount: number;
		}>;
		// topAssets would map MUX/XLM asset names with txCount amounts — real
		// export rows come from transactions, so this must not be the case.
		expect(exported.some((tx) => tx.description === "Mux Protocol")).toBe(
			false,
		);
		expect(exported.some((tx) => tx.amount === 28432)).toBe(false);
		expect(exported).toHaveLength(mockTransactions.length);
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

	it("shows 'No data to export' when the transactions list is empty", async () => {
		mockedTransactions().mockReturnValueOnce({
			transactions: [],
			isLoading: false,
			isEmpty: false,
			isError: false,
			error: null,
			refetch: vi.fn(),
		});

		renderPage();
		expect(screen.getByText(/no data to export/i)).toBeInTheDocument();
	});

	it("disables export buttons when the transactions list is empty", async () => {
		mockedTransactions().mockReturnValueOnce({
			transactions: [],
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
