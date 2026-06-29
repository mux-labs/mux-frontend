import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import AnalyticsPage from "../page";

// Mock the analytics hook
vi.mock("@/hooks/useAnalytics", () => ({
	useAnalytics: vi.fn(() => ({
		data: {
			metrics: [
				{ label: "Total Volume", value: "$12.4M", change: 12.5, changeLabel: "vs last week" },
			],
			volumeData: [],
			transactionsData: [],
			topAssets: [],
		},
		isLoading: false,
		isError: false,
		error: null,
		refetch: vi.fn().mockResolvedValue({
			data: {
				metrics: [
					{ label: "Total Volume", value: "$12.4M", change: 12.5, changeLabel: "vs last week" },
				],
				volumeData: [],
				transactionsData: [],
				topAssets: [],
			},
		}),
	})),
}));

// Mock analytics tracking
vi.mock("@/hooks/useAnalyticsTracking", () => ({
	useAnalyticsTracking: vi.fn(() => ({
		track: vi.fn(),
	})),
}));

describe("AnalyticsPage Toast Feedback", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("date range change toasts", () => {
		it("should show toast when date range is changed via preset", async () => {
			const user = userEvent.setup();
			render(<AnalyticsPage />);

			// Open date picker
			const dateButton = screen.getByRole("button", { name: /→/ });
			await user.click(dateButton);

			// Click a preset
			const lastSevenDays = screen.getByText("Last 7 days");
			await user.click(lastSevenDays);

			// Check for toast
			await waitFor(() => {
				expect(screen.getByText("Date range updated")).toBeInTheDocument();
			});
		});

		it("should show date range details in toast description", async () => {
			const user = userEvent.setup();
			render(<AnalyticsPage />);

			const dateButton = screen.getByRole("button", { name: /→/ });
			await user.click(dateButton);

			const lastThirtyDays = screen.getByText("Last 30 days");
			await user.click(lastThirtyDays);

			await waitFor(() => {
				expect(screen.getByText(/Showing data from/)).toBeInTheDocument();
			});
		});

		it("should dismiss toast after 3 seconds", async () => {
			vi.useFakeTimers();
			const user = userEvent.setup({ delay: null });
			render(<AnalyticsPage />);

			const dateButton = screen.getByRole("button", { name: /→/ });
			await user.click(dateButton);

			const preset = screen.getByText("Last 7 days");
			await user.click(preset);

			await waitFor(() => {
				expect(screen.getByText("Date range updated")).toBeInTheDocument();
			});

			// Fast-forward time
			vi.advanceTimersByTime(3000);

			await waitFor(() => {
				expect(screen.queryByText("Date range updated")).not.toBeInTheDocument();
			});

			vi.useRealTimers();
		});
	});

	describe("refresh action toasts", () => {
		it("should show success toast when data is refreshed", async () => {
			const user = userEvent.setup();
			render(<AnalyticsPage />);

			// Click refresh button
			const refreshButton = screen.getByRole("button", { name: /refresh/i });
			await user.click(refreshButton);

			await waitFor(() => {
				expect(screen.getByText("Analytics data refreshed")).toBeInTheDocument();
			});
		});

		it("should show success message in toast description", async () => {
			const user = userEvent.setup();
			render(<AnalyticsPage />);

			const refreshButton = screen.getByRole("button", { name: /refresh/i });
			await user.click(refreshButton);

			await waitFor(() => {
				expect(
					screen.getByText("Dashboard has been updated with the latest data"),
				).toBeInTheDocument();
			});
		});

		it("should show error toast when refresh fails", async () => {
			// Reset and configure the mock for this test
			const { useAnalytics } = await import("@/hooks/useAnalytics");
			const mockRefetch = vi.fn().mockRejectedValue(new Error("Network error"));
			
			vi.mocked(useAnalytics).mockReturnValueOnce({
				data: {
					metrics: [
						{ label: "Total Volume", value: "$12.4M", change: 12.5, changeLabel: "vs last week" },
					],
					volumeData: [],
					transactionsData: [],
					topAssets: [],
				},
				isLoading: false,
				isError: false,
				error: null,
				refetch: mockRefetch,
			});

			const user = userEvent.setup();
			render(<AnalyticsPage />);

			const refreshButton = screen.getByRole("button", { name: /refresh/i });
			await user.click(refreshButton);

			await waitFor(() => {
				expect(screen.getByText("Failed to refresh data")).toBeInTheDocument();
			});
		});

		it("should show error details in toast description", async () => {
			const { useAnalytics } = await import("@/hooks/useAnalytics");
			const mockRefetch = vi.fn().mockRejectedValue(new Error("Connection timeout"));
			
			vi.mocked(useAnalytics).mockReturnValueOnce({
				data: {
					metrics: [
						{ label: "Total Volume", value: "$12.4M", change: 12.5, changeLabel: "vs last week" },
					],
					volumeData: [],
					transactionsData: [],
					topAssets: [],
				},
				isLoading: false,
				isError: false,
				error: null,
				refetch: mockRefetch,
			});

			const user = userEvent.setup();
			render(<AnalyticsPage />);

			const refreshButton = screen.getByRole("button", { name: /refresh/i });
			await user.click(refreshButton);

			await waitFor(() => {
				expect(screen.getByText("Connection timeout")).toBeInTheDocument();
			});
		});
	});

	describe("toast positioning and styling", () => {
		it("should position toasts at top-right", async () => {
			const user = userEvent.setup();
			render(<AnalyticsPage />);

			const refreshButton = screen.getByRole("button", { name: /refresh/i });
			await user.click(refreshButton);

			await waitFor(() => {
				const toastContainer = screen
					.getByText("Analytics data refreshed")
					.closest('[aria-label="Notifications"]');
				expect(toastContainer).toHaveClass("top-4");
				expect(toastContainer).toHaveClass("right-4");
			});
		});

		it("should show info toast type for date range changes", async () => {
			const user = userEvent.setup();
			render(<AnalyticsPage />);

			const dateButton = screen.getByRole("button", { name: /→/ });
			await user.click(dateButton);
			await user.click(screen.getByText("Last 7 days"));

			await waitFor(() => {
				const toastAlert = screen.getByRole("alert");
				expect(toastAlert).toHaveClass("bg-blue-50");
			});
		});

		it("should show success toast type for refresh", async () => {
			const user = userEvent.setup();
			render(<AnalyticsPage />);

			const refreshButton = screen.getByRole("button", { name: /refresh/i });
			await user.click(refreshButton);

			await waitFor(() => {
				const toastAlert = screen.getByRole("alert");
				expect(toastAlert).toHaveClass("bg-green-50");
			});
		});

		it("should show error toast type for failed refresh", async () => {
			const { useAnalytics } = await import("@/hooks/useAnalytics");
			const mockRefetch = vi.fn().mockRejectedValue(new Error("Error"));
			
			vi.mocked(useAnalytics).mockReturnValueOnce({
				data: {
					metrics: [
						{ label: "Total Volume", value: "$12.4M", change: 12.5, changeLabel: "vs last week" },
					],
					volumeData: [],
					transactionsData: [],
					topAssets: [],
				},
				isLoading: false,
				isError: false,
				error: null,
				refetch: mockRefetch,
			});

			const user = userEvent.setup();
			render(<AnalyticsPage />);

			const refreshButton = screen.getByRole("button", { name: /refresh/i });
			await user.click(refreshButton);

			await waitFor(() => {
				const toastAlert = screen.getByRole("alert");
				expect(toastAlert).toHaveClass("bg-red-50");
			});
		});
	});

	describe("toast accessibility", () => {
		it("should have role=alert on toast items", async () => {
			const user = userEvent.setup();
			render(<AnalyticsPage />);

			const refreshButton = screen.getByRole("button", { name: /refresh/i });
			await user.click(refreshButton);

			await waitFor(() => {
				const toastAlert = screen.getByRole("alert");
				expect(toastAlert).toBeInTheDocument();
			});
		});

		it("should have aria-live=assertive on toast items", async () => {
			const user = userEvent.setup();
			render(<AnalyticsPage />);

			const refreshButton = screen.getByRole("button", { name: /refresh/i });
			await user.click(refreshButton);

			await waitFor(() => {
				const toastAlert = screen.getByRole("alert");
				expect(toastAlert).toHaveAttribute("aria-live", "assertive");
			});
		});

		it("should have dismiss button with proper aria-label", async () => {
			const user = userEvent.setup();
			render(<AnalyticsPage />);

			const refreshButton = screen.getByRole("button", { name: /refresh/i });
			await user.click(refreshButton);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /dismiss success notification/i }),
				).toBeInTheDocument();
			});
		});

		it("should allow manual dismissal of toasts", async () => {
			const user = userEvent.setup();
			render(<AnalyticsPage />);

			const refreshButton = screen.getByRole("button", { name: /refresh/i });
			await user.click(refreshButton);

			await waitFor(() => {
				expect(screen.getByText("Analytics data refreshed")).toBeInTheDocument();
			});

			const dismissButton = screen.getByRole("button", {
				name: /dismiss success notification/i,
			});
			await user.click(dismissButton);

			await waitFor(() => {
				expect(
					screen.queryByText("Analytics data refreshed"),
				).not.toBeInTheDocument();
			});
		});
	});

	describe("multiple toasts", () => {
		it("should stack multiple toasts vertically", async () => {
			const user = userEvent.setup();
			render(<AnalyticsPage />);

			// Trigger multiple actions
			const refreshButton = screen.getByRole("button", { name: /refresh/i });
			await user.click(refreshButton);

			const dateButton = screen.getByRole("button", { name: /→/ });
			await user.click(dateButton);
			await user.click(screen.getByText("Last 7 days"));

			await waitFor(() => {
				expect(screen.getByText("Analytics data refreshed")).toBeInTheDocument();
				expect(screen.getByText("Date range updated")).toBeInTheDocument();
			});
		});

		it("should maintain separate dismiss controls for each toast", async () => {
			const user = userEvent.setup();
			render(<AnalyticsPage />);

			const refreshButton = screen.getByRole("button", { name: /refresh/i });
			await user.click(refreshButton);

			const dateButton = screen.getByRole("button", { name: /→/ });
			await user.click(dateButton);
			await user.click(screen.getByText("Last 7 days"));

			await waitFor(() => {
				const dismissButtons = screen.getAllByRole("button", {
					name: /dismiss.*notification/i,
				});
				expect(dismissButtons.length).toBeGreaterThanOrEqual(2);
			});
		});
	});

	describe("error state with toast", () => {
		it("should show toast container on error page", async () => {
			const { useAnalytics } = await import("@/hooks/useAnalytics");
			const mockRefetch = vi.fn().mockRejectedValue(new Error("Still failing"));
			
			vi.mocked(useAnalytics).mockReturnValueOnce({
				data: null,
				isLoading: false,
				isError: true,
				error: "Network error",
				refetch: mockRefetch,
			});

			const user = userEvent.setup();
			render(<AnalyticsPage />);

			// Should show error state
			expect(screen.getByText("Failed to load analytics")).toBeInTheDocument();

			// Try to retry
			const retryButton = screen.getByRole("button", { name: /try again/i });
			await user.click(retryButton);

			// Should show error toast
			await waitFor(() => {
				expect(screen.getByText("Failed to refresh data")).toBeInTheDocument();
			});
		});
	});
});
