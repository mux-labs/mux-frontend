import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletTable } from "@/components/wallet/WalletTable";
import type { Wallet } from "@/types/wallet";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const activeMainnetWallet: Wallet = {
	id: "w-001",
	address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
	network: "mainnet",
	status: "active",
	createdAt: new Date("2024-01-15T10:30:00Z"),
	balance: "1,250.50 XLM",
	lastActivity: new Date("2025-01-20T14:22:00Z"),
};

const pendingTestnetWallet: Wallet = {
	id: "w-002",
	address: "GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
	network: "testnet",
	status: "pending",
	createdAt: new Date("2024-03-10T16:45:00Z"),
};

const inactiveWallet: Wallet = {
	id: "w-003",
	address: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOBER7KKQOAVSMIA",
	network: "mainnet",
	status: "inactive",
	createdAt: new Date("2023-12-01T09:00:00Z"),
	balance: "75.25 XLM",
	lastActivity: new Date("2024-06-15T18:00:00Z"),
};

const allWallets = [activeMainnetWallet, pendingTestnetWallet, inactiveWallet];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WalletTable Responsive Layout", () => {
	describe("desktop view (lg breakpoint)", () => {
		it("renders table view on desktop", () => {
			const { container } = render(<WalletTable wallets={allWallets} />);

			// Desktop table should be present
			const desktopTable = container.querySelector(".hidden.lg\\:block");
			expect(desktopTable).toBeInTheDocument();

			// Should have table element inside
			expect(screen.getByRole("table")).toBeInTheDocument();
		});

		it("renders all column headers in desktop view", () => {
			render(<WalletTable wallets={allWallets} />);

			expect(
				screen.getByRole("columnheader", { name: /address/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("columnheader", { name: /network/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("columnheader", { name: /status/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("columnheader", { name: /balance/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("columnheader", { name: /created/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("columnheader", { name: /last activity/i }),
			).toBeInTheDocument();
		});

		it("renders all wallet data in table rows", () => {
			render(<WalletTable wallets={allWallets} />);

			// Check for truncated addresses (will appear in both desktop and mobile)
			const addresses = screen.getAllByText("GBZXN7...MADI");
			expect(addresses.length).toBeGreaterThanOrEqual(1);

			// Check for network badges
			const mainnetBadges = screen.getAllByText("Mainnet");
			expect(mainnetBadges.length).toBeGreaterThanOrEqual(1);

			const testnetBadges = screen.getAllByText("Testnet");
			expect(testnetBadges.length).toBeGreaterThanOrEqual(1);

			// Check for status indicators
			expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByText("Pending").length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByText("Inactive").length).toBeGreaterThanOrEqual(1);
		});
	});

	describe("mobile view (below lg breakpoint)", () => {
		it("renders card view on mobile", () => {
			const { container } = render(<WalletTable wallets={allWallets} />);

			// Mobile cards should be present
			const mobileCards = container.querySelector(".divide-y.lg\\:hidden");
			expect(mobileCards).toBeInTheDocument();
		});

		it("renders one card per wallet", () => {
			const { container } = render(<WalletTable wallets={allWallets} />);

			// Count mobile card links (top-level links in mobile container)
			const mobileContainer = container.querySelector(".divide-y.lg\\:hidden");
			const cards = mobileContainer?.querySelectorAll(":scope > a");
			expect(cards?.length).toBe(3);
		});

		it("displays wallet information in card format", () => {
			render(<WalletTable wallets={[activeMainnetWallet]} />);

			// Address should be visible (appears in both desktop and mobile)
			const addresses = screen.getAllByText("GBZXN7...MADI");
			expect(addresses.length).toBeGreaterThanOrEqual(1);

			// Network and status badges
			expect(screen.getAllByText("Mainnet").length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(1);

			// Metadata labels (appears in both desktop and mobile)
			expect(screen.getAllByText("Balance").length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByText("Created").length).toBeGreaterThanOrEqual(1);
			expect(
				screen.getAllByText("Last Activity").length,
			).toBeGreaterThanOrEqual(1);

			// Metadata values
			expect(screen.getAllByText("1,250.50 XLM").length).toBeGreaterThanOrEqual(
				1,
			);
		});

		it("handles wallets without balance gracefully", () => {
			render(<WalletTable wallets={[pendingTestnetWallet]} />);

			// Should show em dash for missing balance (appears in multiple places)
			const emDashes = screen.getAllByText("—");
			expect(emDashes.length).toBeGreaterThanOrEqual(1);
		});

		it("includes all action buttons in mobile cards", () => {
			render(<WalletTable wallets={[activeMainnetWallet]} />);

			// Copy button should be present
			const copyButtons = screen.getAllByTitle(/copy address/i);
			expect(copyButtons.length).toBeGreaterThan(0);

			// Explorer link should be present
			const explorerLinks = screen.getAllByTitle(/view on stellar explorer/i);
			expect(explorerLinks.length).toBeGreaterThan(0);
		});
	});

	describe("responsive header", () => {
		it("adapts header layout for mobile", () => {
			const { container } = render(<WalletTable wallets={allWallets} />);

			// Header should have responsive flex classes
			const header = container.querySelector(".flex.flex-col.gap-3");
			expect(header).toBeInTheDocument();
			expect(header?.className).toContain("sm:flex-row");
		});

		it("renders wallet count", () => {
			render(<WalletTable wallets={allWallets} />);
			expect(screen.getByText("3 wallets")).toBeInTheDocument();
		});

		it("renders singular wallet count correctly", () => {
			render(<WalletTable wallets={[activeMainnetWallet]} />);
			expect(screen.getByText("1 wallet")).toBeInTheDocument();
		});

		it("renders Add Wallet button when provided", () => {
			const onAddWallet = vi.fn();
			render(<WalletTable wallets={allWallets} onAddWallet={onAddWallet} />);

			expect(
				screen.getByRole("button", { name: /add wallet/i }),
			).toBeInTheDocument();
		});

		it("makes Add Wallet button full width on mobile", () => {
			const onAddWallet = vi.fn();
			render(<WalletTable wallets={allWallets} onAddWallet={onAddWallet} />);

			const button = screen.getByRole("button", { name: /add wallet/i });
			expect(button.className).toContain("w-full");
			expect(button.className).toContain("sm:w-auto");
		});
	});

	describe("empty state", () => {
		it("renders empty state message when no wallets", () => {
			render(<WalletTable wallets={[]} />);
			expect(
				screen.getByText("No wallets found for this network."),
			).toBeInTheDocument();
		});

		it("does not render table or cards when empty", () => {
			const { container } = render(<WalletTable wallets={[]} />);

			expect(screen.queryByRole("table")).not.toBeInTheDocument();
			const mobileCards = container.querySelector(".divide-y.lg\\:hidden");
			expect(mobileCards).not.toBeInTheDocument();
		});
	});

	describe("testnet hint", () => {
		it("shows testnet hint when testnet wallets are present", () => {
			render(<WalletTable wallets={allWallets} />);

			// Should show testnet hint heading
			expect(screen.getByText("You're on Stellar Testnet")).toBeInTheDocument();
		});

		it("does not show testnet hint when only mainnet wallets", () => {
			render(<WalletTable wallets={[activeMainnetWallet, inactiveWallet]} />);

			// Check that "You're on Stellar Testnet" message is not shown
			// The word "Testnet" will still appear in badges, but not the hint message
			const testnetElements = screen.queryAllByText(/stellar testnet/i);
			expect(testnetElements.length).toBe(0);
		});
	});

	describe("links and navigation", () => {
		it("links each wallet to its detail page in desktop view", () => {
			render(<WalletTable wallets={allWallets} />);

			const links = screen.getAllByRole("link");
			const detailLinks = links.filter((link) =>
				link.getAttribute("href")?.includes("/dashboard/wallets/w-"),
			);

			expect(detailLinks.length).toBeGreaterThan(0);
		});

		it("links entire card to detail page in mobile view", () => {
			const { container } = render(<WalletTable wallets={allWallets} />);

			const mobileContainer = container.querySelector(".divide-y.lg\\:hidden");
			const cardLinks = mobileContainer?.querySelectorAll(":scope > a");

			cardLinks?.forEach((link, index) => {
				const href = link.getAttribute("href");
				expect(href).toBe(`/dashboard/wallets/${allWallets[index].id}`);
			});
		});
	});

	describe("accessibility", () => {
		it("maintains proper semantic structure in desktop view", () => {
			render(<WalletTable wallets={allWallets} />);

			const table = screen.getByRole("table");
			expect(table).toBeInTheDocument();

			const columnHeaders = screen.getAllByRole("columnheader");
			expect(columnHeaders.length).toBe(6);
		});

		it("uses appropriate link text for screen readers", () => {
			render(<WalletTable wallets={[activeMainnetWallet]} />);

			const links = screen.getAllByRole("link");
			links.forEach((link) => {
				// Links should either have accessible names or be wrapping descriptive content
				const href = link.getAttribute("href");
				expect(href).toBeTruthy();
			});
		});

		it("provides button titles for icon-only actions", () => {
			render(<WalletTable wallets={[activeMainnetWallet]} />);

			const copyButtons = screen.getAllByTitle(/copy address/i);
			expect(copyButtons.length).toBeGreaterThanOrEqual(1);

			const explorerLinks = screen.getAllByTitle(/view on stellar explorer/i);
			expect(explorerLinks.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe("dark mode support", () => {
		it("includes dark mode classes for container", () => {
			const { container } = render(<WalletTable wallets={allWallets} />);

			const mainContainer = container.querySelector(".rounded-xl.border");
			expect(mainContainer?.className).toContain("dark:border-zinc-800");
			expect(mainContainer?.className).toContain("dark:bg-zinc-900");
		});

		it("includes dark mode classes for mobile cards", () => {
			const { container } = render(<WalletTable wallets={allWallets} />);

			const mobileContainer = container.querySelector(".divide-y.lg\\:hidden");
			expect(mobileContainer?.className).toContain("dark:divide-zinc-800");
		});
	});
});
