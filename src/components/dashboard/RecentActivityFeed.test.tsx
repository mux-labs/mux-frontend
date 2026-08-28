import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchRecentActivity } from "@/lib/api";
import { ReactQueryTestProvider } from "@/test/reactQueryWrapper";
import { RecentActivityFeed } from "./RecentActivityFeed";

vi.mock("@/lib/api", () => ({
	fetchRecentActivity: vi.fn(),
}));

// RecentActivityFeed now reads through TanStack Query (#619), so every
// render needs a QueryClient in context.
function render(ui: Parameters<typeof rtlRender>[0]) {
	return rtlRender(<ReactQueryTestProvider>{ui}</ReactQueryTestProvider>);
}

const mockFetchRecentActivity = vi.mocked(fetchRecentActivity);

describe("RecentActivityFeed", () => {
	beforeEach(() => {
		mockFetchRecentActivity.mockReset();
		mockFetchRecentActivity.mockResolvedValue([
			{
				id: "activity-1",
				type: "wallet_created",
				description: "New wallet created on mainnet",
				timestamp: new Date().toISOString(),
				status: "success",
				network: "mainnet",
			},
			{
				id: "activity-2",
				type: "transaction",
				description: "Transaction of 150 XLM completed",
				timestamp: new Date().toISOString(),
				status: "pending",
				network: "testnet",
			},
		]);
	});

	it("renders loading skeleton initially", () => {
		render(<RecentActivityFeed />);
		expect(screen.getAllByTestId(/skeleton/i)).toBeTruthy();
	});

	it("displays activity feed after loading", async () => {
		render(<RecentActivityFeed />);

		await waitFor(() => {
			expect(screen.getByText("Recent Activity")).toBeInTheDocument();
		});
	});

	it("displays activity items", async () => {
		render(<RecentActivityFeed />);

		await waitFor(() => {
			expect(
				screen.getByText(/New wallet created on mainnet/i),
			).toBeInTheDocument();
			expect(
				screen.getByText(/Transaction of 150 XLM completed/i),
			).toBeInTheDocument();
		});
	});

	it("shows empty state when no activities", async () => {
		mockFetchRecentActivity.mockResolvedValueOnce([]);

		render(<RecentActivityFeed />);

		expect(await screen.findByText("No recent activity")).toBeInTheDocument();
	});

	it("shows an error state when activity cannot load", async () => {
		mockFetchRecentActivity.mockRejectedValueOnce(new Error("network"));

		render(<RecentActivityFeed />);

		expect(
			await screen.findByText(
				"Failed to load recent activity. Please try again.",
			),
		).toBeInTheDocument();
	});
});
