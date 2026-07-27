import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchOverview } from "@/lib/api";
import { DashboardOverview } from "./DashboardOverview";

vi.mock("@/lib/api", () => ({
	fetchOverview: vi.fn(),
}));

const mockFetchOverview = vi.mocked(fetchOverview);

describe("DashboardOverview", () => {
	beforeEach(() => {
		mockFetchOverview.mockReset();
		mockFetchOverview.mockResolvedValue({
			totalWallets: 156,
			activeWallets: 142,
			totalTransactions: 2847,
			totalVolumeXlm: "45230.50",
			apiRequestsToday: 1284,
			lastUpdated: "2026-07-27T10:00:00.000Z",
		});
	});

	it("renders loading skeleton initially", () => {
		render(<DashboardOverview />);
		expect(screen.getAllByTestId(/skeleton/i)).toBeTruthy();
	});

	it("displays overview stats after loading", async () => {
		render(<DashboardOverview />);

		await waitFor(() => {
			expect(screen.getByText("Overview")).toBeInTheDocument();
		});
	});

	it("has a refresh button", async () => {
		render(<DashboardOverview />);

		await waitFor(() => {
			const refreshButton = screen.getByRole("button", {
				name: /refresh dashboard overview/i,
			});
			expect(refreshButton).toBeInTheDocument();
		});
	});

	it("refreshes overview metrics on demand", async () => {
		render(<DashboardOverview />);

		const refreshButton = await screen.findByRole("button", {
			name: /refresh dashboard overview/i,
		});
		fireEvent.click(refreshButton);

		await waitFor(() => {
			expect(mockFetchOverview).toHaveBeenCalledTimes(2);
		});
	});

	it("displays stat cards with correct data", async () => {
		render(<DashboardOverview />);

		await waitFor(() => {
			expect(screen.getByText("Total Wallets")).toBeInTheDocument();
			expect(screen.getByText("Active Wallets")).toBeInTheDocument();
			expect(screen.getByText("Total Transactions")).toBeInTheDocument();
			expect(screen.getByText("Total Volume")).toBeInTheDocument();
			expect(screen.getByText("API Requests Today")).toBeInTheDocument();
			expect(screen.getByText("45,230.5 XLM")).toBeInTheDocument();
			expect(screen.getByText("1,284")).toBeInTheDocument();
		});
	});

	it("shows an empty state when no overview data is returned", async () => {
		mockFetchOverview.mockResolvedValueOnce(null);

		render(<DashboardOverview />);

		expect(await screen.findByText("No overview data yet")).toBeInTheDocument();
	});

	it("shows an error state with retry", async () => {
		mockFetchOverview
			.mockRejectedValueOnce(new Error("network"))
			.mockResolvedValueOnce({
				totalWallets: 1,
				activeWallets: 1,
				totalTransactions: 1,
				totalVolumeXlm: "1",
				apiRequestsToday: 1,
				lastUpdated: "2026-07-27T10:00:00.000Z",
			});

		render(<DashboardOverview />);

		expect(
			await screen.findByText("Failed to load overview stats. Please try again."),
		).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /retry/i }));

		expect(await screen.findByText("Total Wallets")).toBeInTheDocument();
	});
});
