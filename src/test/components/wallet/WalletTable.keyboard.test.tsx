import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletTable } from "@/components/wallet/WalletTable";
import type { Wallet } from "@/types/wallet";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockPush,
	}),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const testWallets: Wallet[] = [
	{
		id: "w-001",
		address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
		network: "mainnet",
		status: "active",
		createdAt: new Date("2024-01-15T10:30:00Z"),
		balance: "1,250.50 XLM",
		lastActivity: new Date("2025-01-20T14:22:00Z"),
	},
	{
		id: "w-002",
		address: "GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
		network: "testnet",
		status: "pending",
		createdAt: new Date("2024-03-10T16:45:00Z"),
	},
	{
		id: "w-003",
		address: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOBER7KKQOAVSMIA",
		network: "mainnet",
		status: "inactive",
		createdAt: new Date("2023-12-01T09:00:00Z"),
		balance: "75.25 XLM",
		lastActivity: new Date("2024-06-15T18:00:00Z"),
	},
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WalletTable Keyboard Navigation", () => {
	beforeEach(() => {
		mockPush.mockClear();
	});

	describe("arrow key navigation", () => {
		it("should navigate down through wallet rows with ArrowDown", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const rows = screen.getAllByTestId(/wallet-row-/);

			// Focus first row
			rows[0].focus();
			expect(rows[0]).toHaveFocus();

			// Press ArrowDown to move to second row
			await user.keyboard("{ArrowDown}");
			expect(rows[1]).toHaveFocus();

			// Press ArrowDown again to move to third row
			await user.keyboard("{ArrowDown}");
			expect(rows[2]).toHaveFocus();
		});

		it("should navigate up through wallet rows with ArrowUp", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const rows = screen.getAllByTestId(/wallet-row-/);

			// Focus third row
			rows[2].focus();
			expect(rows[2]).toHaveFocus();

			// Press ArrowUp to move to second row
			await user.keyboard("{ArrowUp}");
			expect(rows[1]).toHaveFocus();

			// Press ArrowUp again to move to first row
			await user.keyboard("{ArrowUp}");
			expect(rows[0]).toHaveFocus();
		});

		it("should not navigate up from first row", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const rows = screen.getAllByTestId(/wallet-row-/);

			// Focus first row
			rows[0].focus();
			expect(rows[0]).toHaveFocus();

			// Press ArrowUp (should stay on first row)
			await user.keyboard("{ArrowUp}");
			expect(rows[0]).toHaveFocus();
		});

		it("should not navigate down from last row", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const rows = screen.getAllByTestId(/wallet-row-/);
			const lastIndex = rows.length - 1;

			// Focus last row
			rows[lastIndex].focus();
			expect(rows[lastIndex]).toHaveFocus();

			// Press ArrowDown (should stay on last row)
			await user.keyboard("{ArrowDown}");
			expect(rows[lastIndex]).toHaveFocus();
		});
	});

	describe("enter and space key navigation", () => {
		it("should navigate to wallet detail page on Enter key", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const rows = screen.getAllByTestId(/wallet-row-/);

			// Focus first row
			rows[0].focus();

			// Press Enter
			await user.keyboard("{Enter}");

			// Should call router.push with correct URL
			expect(mockPush).toHaveBeenCalledWith("/demo/dashboard/wallets/w-001");
		});

		it("should navigate to wallet detail page on Space key", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const rows = screen.getAllByTestId(/wallet-row-/);

			// Focus second row
			rows[1].focus();

			// Press Space
			await user.keyboard("{ }");

			// Should call router.push with correct URL
			expect(mockPush).toHaveBeenCalledWith("/demo/dashboard/wallets/w-002");
		});
	});

	describe("home and end key navigation", () => {
		it("should jump to first row on Home key", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const rows = screen.getAllByTestId(/wallet-row-/);

			// Focus last row
			rows[2].focus();
			expect(rows[2]).toHaveFocus();

			// Press Home
			await user.keyboard("{Home}");
			expect(rows[0]).toHaveFocus();
		});

		it("should jump to last row on End key", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const rows = screen.getAllByTestId(/wallet-row-/);

			// Focus first row
			rows[0].focus();
			expect(rows[0]).toHaveFocus();

			// Press End
			await user.keyboard("{End}");
			expect(rows[2]).toHaveFocus();
		});
	});

	describe("focus management", () => {
		it("should apply focus ring styles when row is focused", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const rows = screen.getAllByTestId(/wallet-row-/);

			// Focus first row
			await user.click(rows[0]);
			rows[0].focus();

			// Should have focus ring classes
			expect(rows[0]).toHaveClass("ring-2");
			expect(rows[0]).toHaveClass("ring-blue-500");
		});

		it("should remove focus ring when row loses focus", () => {
			render(<WalletTable wallets={testWallets} />);

			const rows = screen.getAllByTestId(/wallet-row-/);

			// Focus first row then blur
			rows[0].focus();
			rows[0].blur();

			// Should not have focus ring after blur
			// Note: the focus ring is applied conditionally based on focusedIndex state
			// After blur, focusedIndex becomes -1
			expect(rows[0].className).not.toContain("ring-2 ring-blue-500");
		});

		it("should make all rows keyboard accessible with tabIndex", () => {
			render(<WalletTable wallets={testWallets} />);

			const rows = screen.getAllByTestId(/wallet-row-/);

			rows.forEach((row) => {
				expect(row).toHaveAttribute("tabIndex", "0");
			});
		});

		it("should have descriptive aria-label for screen readers", () => {
			render(<WalletTable wallets={testWallets} />);

			const firstRow = screen.getByTestId("wallet-row-0");
			const ariaLabel = firstRow.getAttribute("aria-label");

			// Should contain truncated address, network, and status
			expect(ariaLabel).toContain("GBZXN7...MADI");
			expect(ariaLabel).toContain("mainnet");
			expect(ariaLabel).toContain("active");
		});
	});

	describe("tab navigation", () => {
		it("should set links to tabIndex -1 to prevent tab conflicts", () => {
			render(<WalletTable wallets={testWallets} />);

			const rows = screen.getAllByTestId(/wallet-row-/);

			// The first link in each row should have tabIndex="-1" to prevent tab conflicts
			// This ensures row-level keyboard navigation works properly
			const firstRow = rows[0];
			const firstLink = firstRow.querySelector(
				"a[href*='/demo/dashboard/wallets']",
			);

			// The link should have tabIndex -1 to prevent it from stealing focus during keyboard nav
			expect(firstLink).toHaveAttribute("tabIndex", "-1");
		});
	});

	describe("empty state", () => {
		it("should not apply keyboard navigation when no wallets", () => {
			render(<WalletTable wallets={[]} />);

			const rows = screen.queryAllByTestId(/wallet-row-/);
			expect(rows).toHaveLength(0);

			// Should show empty state message
			expect(
				screen.getByText("No wallets found for this network."),
			).toBeInTheDocument();
		});
	});

	describe("navigation with single wallet", () => {
		it("should handle keyboard navigation with only one wallet", async () => {
			const user = userEvent.setup();
			const singleWallet = [testWallets[0]];
			render(<WalletTable wallets={singleWallet} />);

			const row = screen.getByTestId("wallet-row-0");

			// Focus the row
			row.focus();
			expect(row).toHaveFocus();

			// ArrowUp should do nothing
			await user.keyboard("{ArrowUp}");
			expect(row).toHaveFocus();

			// ArrowDown should do nothing
			await user.keyboard("{ArrowDown}");
			expect(row).toHaveFocus();

			// Home and End should keep focus on the same row
			await user.keyboard("{Home}");
			expect(row).toHaveFocus();

			await user.keyboard("{End}");
			expect(row).toHaveFocus();

			// Enter should still navigate
			await user.keyboard("{Enter}");
			expect(mockPush).toHaveBeenCalledWith("/demo/dashboard/wallets/w-001");
		});
	});

	describe("complex navigation sequences", () => {
		it("should handle rapid arrow key presses", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const rows = screen.getAllByTestId(/wallet-row-/);

			// Focus first row
			rows[0].focus();

			// Rapidly press ArrowDown multiple times
			await user.keyboard("{ArrowDown}{ArrowDown}");
			expect(rows[2]).toHaveFocus();

			// Rapidly press ArrowUp multiple times
			await user.keyboard("{ArrowUp}{ArrowUp}");
			expect(rows[0]).toHaveFocus();
		});

		it("should handle mixed navigation keys", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const rows = screen.getAllByTestId(/wallet-row-/);

			// Focus first row
			rows[0].focus();

			// Navigate: Down, Down, Up, End, Home
			await user.keyboard("{ArrowDown}");
			expect(rows[1]).toHaveFocus();

			await user.keyboard("{ArrowDown}");
			expect(rows[2]).toHaveFocus();

			await user.keyboard("{ArrowUp}");
			expect(rows[1]).toHaveFocus();

			await user.keyboard("{End}");
			expect(rows[2]).toHaveFocus();

			await user.keyboard("{Home}");
			expect(rows[0]).toHaveFocus();
		});
	});

	describe("accessibility attributes", () => {
		it("should have role='row' for table rows", () => {
			render(<WalletTable wallets={testWallets} />);

			const rows = screen.getAllByTestId(/wallet-row-/);

			rows.forEach((row) => {
				// TableRow component should render as a tr element with implicit row role
				expect(row.tagName).toBe("TR");
			});
		});

		it("should maintain semantic table structure", () => {
			render(<WalletTable wallets={testWallets} />);

			// Should have table structure
			expect(screen.getByRole("table")).toBeInTheDocument();

			// Should have column headers
			expect(
				screen.getByRole("columnheader", { name: /address/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("columnheader", { name: /network/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("columnheader", { name: /status/i }),
			).toBeInTheDocument();
		});
	});

	describe("dark mode compatibility", () => {
		it("should apply dark mode focus ring styles", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const rows = screen.getAllByTestId(/wallet-row-/);

			// Focus first row
			await user.click(rows[0]);
			rows[0].focus();

			// Should have both light and dark mode ring classes
			expect(rows[0].className).toContain("ring-blue-500");
			expect(rows[0].className).toContain("dark:ring-blue-400");
		});
	});
});
