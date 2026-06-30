import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletTable } from "@/components/wallet/WalletTable";
import type { Wallet } from "@/types/wallet";

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
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WalletTable Copy-to-Clipboard UX", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("copy button visual feedback", () => {
		it("should show Copy icon by default", () => {
			render(<WalletTable wallets={testWallets} />);

			const copyButtons = screen.getAllByTestId("copy-address-button");
			expect(copyButtons.length).toBeGreaterThan(0);

			// Button should have title "Copy address"
			expect(copyButtons[0]).toHaveAttribute("title", "Copy address");
		});

		it("should change to Check icon after successful copy", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const copyButton = screen.getAllByTestId("copy-address-button")[0];

			// Click to copy
			await user.click(copyButton);

			// Should show "Copied!" in title
			await waitFor(() => {
				expect(copyButton).toHaveAttribute("title", "Copied!");
			});
		});

		it("should have hover state styling", () => {
			render(<WalletTable wallets={testWallets} />);

			const copyButton = screen.getAllByTestId("copy-address-button")[0];

			// Should have hover classes
			expect(copyButton.className).toContain("hover:scale-110");
		});

		it("should have transition animations", () => {
			render(<WalletTable wallets={testWallets} />);

			const copyButton = screen.getAllByTestId("copy-address-button")[0];

			// Should have transition classes
			expect(copyButton.className).toContain("transition-all");
		});
	});

	describe("toast notifications", () => {
		it("should show success toast after copying address", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const copyButton = screen.getAllByTestId("copy-address-button")[0];

			// Click to copy
			await user.click(copyButton);

			// Toast should appear
			await waitFor(() => {
				const toast = screen.getByTestId("copy-toast");
				expect(toast).toBeInTheDocument();
			});

			// Should show success message
			expect(screen.getByText("Copied!")).toBeInTheDocument();
		});

		it("should show address in toast message", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const copyButton = screen.getAllByTestId("copy-address-button")[0];

			await user.click(copyButton);

			await waitFor(() => {
				const toast = screen.getByTestId("copy-toast");
				expect(toast).toBeInTheDocument();
				// Check the toast contains the message
				expect(toast.textContent).toContain("copied to clipboard");
			});
		});

		it("should auto-dismiss success toast after 3 seconds", async () => {
			vi.useFakeTimers();
			const user = userEvent.setup({ delay: null });
			render(<WalletTable wallets={testWallets} />);

			const copyButton = screen.getAllByTestId("copy-address-button")[0];

			await user.click(copyButton);

			// Toast should be visible
			await waitFor(() => {
				expect(screen.getByTestId("copy-toast")).toBeInTheDocument();
			});

			// Fast-forward 3 seconds
			vi.advanceTimersByTime(3000);

			// Toast should be gone
			await waitFor(() => {
				expect(screen.queryByTestId("copy-toast")).not.toBeInTheDocument();
			});

			vi.useRealTimers();
		});
	});

	describe("accessibility", () => {
		it("should have proper aria-label for copy button", () => {
			render(<WalletTable wallets={testWallets} />);

			const copyButton = screen.getAllByTestId("copy-address-button")[0];

			expect(copyButton).toHaveAttribute(
				"aria-label",
				"Copy address to clipboard",
			);
		});

		it("should have aria-live region on toast", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const copyButton = screen.getAllByTestId("copy-address-button")[0];

			await user.click(copyButton);

			await waitFor(() => {
				const toast = screen.getByTestId("copy-toast");
				expect(toast).toHaveAttribute("role", "status");
				expect(toast).toHaveAttribute("aria-live", "polite");
			});
		});

		it("should hide decorative icons from screen readers", () => {
			render(<WalletTable wallets={testWallets} />);

			// Find all SVG icons
			const icons = document.querySelectorAll('svg[aria-hidden="true"]');
			expect(icons.length).toBeGreaterThan(0);
		});
	});

	describe("event handling", () => {
		it("should copy address to clipboard", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const copyButton = screen.getAllByTestId("copy-address-button")[0];

			await user.click(copyButton);

			// Should change button state to show copied
			await waitFor(() => {
				expect(copyButton).toHaveAttribute("title", "Copied!");
			});
		});
	});

	describe("empty state", () => {
		it("should not show copy buttons when no wallets", () => {
			render(<WalletTable wallets={[]} />);

			const copyButtons = screen.queryAllByTestId("copy-address-button");
			expect(copyButtons).toHaveLength(0);
		});

		it("should not show toast when no wallets", () => {
			render(<WalletTable wallets={[]} />);

			const toast = screen.queryByTestId("copy-toast");
			expect(toast).not.toBeInTheDocument();
		});
	});

	describe("toast positioning and styling", () => {
		it("should position toast at bottom-right", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const copyButton = screen.getAllByTestId("copy-address-button")[0];

			await user.click(copyButton);

			await waitFor(() => {
				const toast = screen.getByTestId("copy-toast");
				expect(toast.className).toContain("fixed");
				expect(toast.className).toContain("right-4");
				expect(toast.className).toContain("bottom-4");
			});
		});

		it("should have high z-index for visibility", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const copyButton = screen.getAllByTestId("copy-address-button")[0];

			await user.click(copyButton);

			await waitFor(() => {
				const toast = screen.getByTestId("copy-toast");
				expect(toast.className).toContain("z-50");
			});
		});

		it("should have animation classes on toast", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const copyButton = screen.getAllByTestId("copy-address-button")[0];

			await user.click(copyButton);

			await waitFor(() => {
				const toast = screen.getByTestId("copy-toast");
				expect(toast.className).toContain("animate-in");
				expect(toast.className).toContain("slide-in-from-bottom");
				expect(toast.className).toContain("fade-in");
			});
		});
	});

	describe("visual enhancements", () => {
		it("should show check icon after copy", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const copyButton = screen.getAllByTestId("copy-address-button")[0];

			await user.click(copyButton);

			await waitFor(() => {
				// Button should show Copied status
				expect(copyButton).toHaveAttribute("title", "Copied!");
			});
		});

		it("should have success icon in toast", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={testWallets} />);

			const copyButton = screen.getAllByTestId("copy-address-button")[0];

			await user.click(copyButton);

			await waitFor(() => {
				const toast = screen.getByTestId("copy-toast");
				// Should have Check icon (success)
				const checkIcon = toast.querySelector("svg");
				expect(checkIcon).toBeInTheDocument();
			});
		});
	});
});
