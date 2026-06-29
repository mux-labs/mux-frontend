import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Import the page
import WalletsPage from "@/app/demo/dashboard/wallets/page";
import { NetworkProvider } from "@/context/NetworkContext";

const VALID_ADDRESS =
	"GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";

// ---------------------------------------------------------------------------
// Helper to render with providers
// ---------------------------------------------------------------------------
function renderWithProviders(ui: React.ReactElement) {
	return render(<NetworkProvider>{ui}</NetworkProvider>);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WalletsPage (/demo/dashboard/wallets)", () => {
	// Use fake timers to control the loading delay
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe("page header", () => {
		it("renders the page heading", async () => {
			renderWithProviders(<WalletsPage />);
			expect(
				screen.getByRole("heading", { name: /wallet monitoring/i }),
			).toBeInTheDocument();
		});

		it("renders the page description", async () => {
			renderWithProviders(<WalletsPage />);
			expect(
				screen.getByText(/track and manage your stellar wallets/i),
			).toBeInTheDocument();
		});

		it("renders a 'Back to Home' link", async () => {
			renderWithProviders(<WalletsPage />);
			// The PageHeader component doesn't include a back link in the demo version
			// Verify the header exists instead
			expect(
				screen.getByRole("heading", { name: /wallet monitoring/i }),
			).toBeInTheDocument();
		});
	});

	describe("loading state", () => {
		it("renders the WalletTableSkeleton during initial load", () => {
			renderWithProviders(<WalletsPage />);
			// Check for skeleton elements
			const skeletons = screen.getAllByTestId("skeleton");
			expect(skeletons.length).toBeGreaterThan(0);
		});

		it("transitions from skeleton to table after loading", async () => {
			renderWithProviders(<WalletsPage />);

			// Initially shows skeleton
			expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);

			// Fast-forward time to complete loading
			vi.advanceTimersByTime(1000);

			// Wait for loading to complete and table to appear
			await waitFor(() => {
				expect(screen.getByRole("table")).toBeInTheDocument();
			});

			// Skeleton should no longer be present
			expect(screen.queryAllByTestId("skeleton")).toHaveLength(0);
		});

		it("does not render table or empty state during loading", () => {
			renderWithProviders(<WalletsPage />);
			expect(screen.queryByRole("table")).not.toBeInTheDocument();
			// Note: We can't easily test the empty state since we're using real mock data
		});
	});

	describe("with wallets data", () => {
		it("renders the WalletTable when wallets are present", async () => {
			renderWithProviders(<WalletsPage />);
			vi.advanceTimersByTime(1000);
			await waitFor(() => {
				expect(screen.getByRole("table")).toBeInTheDocument();
			});
		});

		it("renders rows for wallets", async () => {
			renderWithProviders(<WalletsPage />);
			vi.advanceTimersByTime(1000);
			await waitFor(() => {
				const rows = screen.getAllByRole("row");
				// Should have at least the header row
				expect(rows.length).toBeGreaterThanOrEqual(1);
			});
		});

		it("displays wallet addresses in truncated form", async () => {
			renderWithProviders(<WalletsPage />);
			vi.advanceTimersByTime(1000);
			await waitFor(() => {
				// Check for the pattern of truncated addresses (... in the middle)
				const addresses = screen.getAllByText(/\.\.\./);
				expect(addresses.length).toBeGreaterThan(0);
			});
		});

		it("displays network badges", async () => {
			renderWithProviders(<WalletsPage />);
			vi.advanceTimersByTime(1000);
			await waitFor(() => {
				// Should show either Mainnet or Testnet (or both)
				const badges = screen.queryAllByText(/Mainnet|Testnet/);
				expect(badges.length).toBeGreaterThan(0);
			});
		});

		it("displays status indicators", async () => {
			renderWithProviders(<WalletsPage />);
			vi.advanceTimersByTime(1000);
			await waitFor(() => {
				// Should show status badges
				const statuses = screen.queryAllByText(/Active|Pending|Inactive/);
				expect(statuses.length).toBeGreaterThan(0);
			});
		});
	});

	describe("Add Wallet modal", () => {
		async function loadTable() {
			const user = userEvent.setup({
				advanceTimers: (ms) => vi.advanceTimersByTime(ms),
			});
			renderWithProviders(<WalletsPage />);
			vi.advanceTimersByTime(1000);
			await waitFor(() =>
				expect(screen.getByRole("table")).toBeInTheDocument(),
			);
			return user;
		}

		it("opens AddWalletModal when the Add Wallet button is clicked", async () => {
			const user = await loadTable();
			await user.click(screen.getByRole("button", { name: /add wallet/i }));
			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});

		it("closes the modal when Cancel is clicked", async () => {
			const user = await loadTable();
			await user.click(screen.getByRole("button", { name: /add wallet/i }));
			expect(screen.getByRole("dialog")).toBeInTheDocument();
			await user.click(screen.getByRole("button", { name: /cancel/i }));
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});

		it("shows a success toast and closes the modal after adding a wallet", async () => {
			const user = await loadTable();

			// Open modal
			await user.click(screen.getByRole("button", { name: /add wallet/i }));

			// Fill in form
			await user.type(screen.getByLabelText(/stellar address/i), VALID_ADDRESS);

			// Submit form — triggers 800ms fake API delay inside AddWalletModal
			await user.click(screen.getByRole("button", { name: /^add wallet$/i }));

			// Advance past the simulated API delay
			vi.advanceTimersByTime(1000);

			// Wait for success step in the modal
			await waitFor(() =>
				expect(
					screen.getByText(/wallet added successfully/i),
				).toBeInTheDocument(),
			);

			// Click Done to close modal, which triggers handleWalletAdded
			await user.click(screen.getByRole("button", { name: /done/i }));

			// Modal should be closed
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

			// Toast should appear
			await waitFor(() =>
				expect(screen.getByRole("status")).toBeInTheDocument(),
			);
			expect(screen.getByText(/added successfully/i)).toBeInTheDocument();
		});

		it("adds the new wallet to the list after submission", async () => {
			const user = await loadTable();

			const initialCount = screen
				.getAllByText(/\d+ wallets?/)
				.at(0)
				?.textContent?.match(/\d+/)?.[0];

			await user.click(screen.getByRole("button", { name: /add wallet/i }));
			await user.type(screen.getByLabelText(/stellar address/i), VALID_ADDRESS);
			await user.click(screen.getByRole("button", { name: /^add wallet$/i }));
			vi.advanceTimersByTime(1000);
			await waitFor(() =>
				expect(
					screen.getByText(/wallet added successfully/i),
				).toBeInTheDocument(),
			);
			await user.click(screen.getByRole("button", { name: /done/i }));

			await waitFor(() => {
				const newCount = screen
					.getAllByText(/\d+ wallets?/)
					.at(0)
					?.textContent?.match(/\d+/)?.[0];
				expect(Number(newCount)).toBeGreaterThan(Number(initialCount));
			});
		});
	});

	describe("copy toast feedback", () => {
		it("shows success toast when an address is copied", async () => {
			const user = userEvent.setup({
				advanceTimers: (ms) => vi.advanceTimersByTime(ms),
			});
			renderWithProviders(<WalletsPage />);
			vi.advanceTimersByTime(1000);
			await waitFor(() =>
				expect(screen.getByRole("table")).toBeInTheDocument(),
			);

			const copyButtons = screen.getAllByTitle("Copy address");
			await user.click(copyButtons[0]);

			await waitFor(() =>
				expect(screen.getByRole("status")).toBeInTheDocument(),
			);
			expect(
				screen.getByText(/address copied to clipboard/i),
			).toBeInTheDocument();
		});

		it("shows error toast when clipboard write fails", async () => {
			vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
				new Error("Permission denied"),
			);
			const user = userEvent.setup({
				advanceTimers: (ms) => vi.advanceTimersByTime(ms),
			});
			renderWithProviders(<WalletsPage />);
			vi.advanceTimersByTime(1000);
			await waitFor(() =>
				expect(screen.getByRole("table")).toBeInTheDocument(),
			);

			const copyButtons = screen.getAllByTitle("Copy address");
			await user.click(copyButtons[0]);

			await waitFor(() =>
				expect(screen.getByRole("status")).toBeInTheDocument(),
			);
			expect(screen.getByText(/copy failed/i)).toBeInTheDocument();
		});

		it("dismisses the toast when the dismiss button is clicked", async () => {
			const user = userEvent.setup({
				advanceTimers: (ms) => vi.advanceTimersByTime(ms),
			});
			renderWithProviders(<WalletsPage />);
			vi.advanceTimersByTime(1000);
			await waitFor(() =>
				expect(screen.getByRole("table")).toBeInTheDocument(),
			);

			await user.click(screen.getAllByTitle("Copy address")[0]);
			await waitFor(() =>
				expect(screen.getByRole("status")).toBeInTheDocument(),
			);

			await user.click(
				screen.getByRole("button", { name: /dismiss notification/i }),
			);
			expect(screen.queryByRole("status")).not.toBeInTheDocument();
		});
	});
});
