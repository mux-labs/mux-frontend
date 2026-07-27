import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { Wallet } from "@/types/wallet";
import { WalletTable } from "../WalletTable";

// Mock the useCopyToClipboard hook (include error: null to match real hook signature)
vi.mock("@/hooks/useCopyToClipboard", () => ({
	useCopyToClipboard: () => ({
		copy: vi.fn(),
		copied: false,
		error: null,
	}),
}));

describe("WalletTable", () => {
	const mockWallets: Wallet[] = [
		{
			id: "wallet-001",
			address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
			network: "mainnet",
			status: "active",
			createdAt: new Date("2024-01-15T10:30:00Z"),
			balance: "1,250.50 XLM",
			lastActivity: new Date("2025-01-20T14:22:00Z"),
		},
		{
			id: "wallet-002",
			address: "GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
			network: "testnet",
			status: "pending",
			createdAt: new Date("2024-02-20T08:15:00Z"),
			balance: "500.00 XLM",
		},
	];

	describe("Rendering", () => {
		it("should render table structure", () => {
			render(<WalletTable wallets={mockWallets} />);
			expect(screen.getByRole("table")).toBeInTheDocument();
		});

		it("should render table headers", () => {
			render(<WalletTable wallets={mockWallets} />);
			expect(screen.getByText("Address")).toBeInTheDocument();
			expect(screen.getByText("Network")).toBeInTheDocument();
			expect(screen.getByText("Status")).toBeInTheDocument();
			expect(screen.getByText("Balance")).toBeInTheDocument();
			expect(screen.getByText("Created")).toBeInTheDocument();
			expect(screen.getByText("Last Activity")).toBeInTheDocument();
		});

		it("should render all wallet rows", () => {
			render(<WalletTable wallets={mockWallets} />);
			// Responsive layout duplicates badges across desktop table and mobile cards
			expect(screen.getAllByText("Mainnet").length).toBeGreaterThan(0);
			expect(screen.getAllByText("Testnet").length).toBeGreaterThan(0);
		});
	});

	describe("NetworkBadge integration", () => {
		it("should display network badge for each wallet", () => {
			render(<WalletTable wallets={mockWallets} />);
			expect(screen.getAllByText("Mainnet").length).toBeGreaterThan(0);
			expect(screen.getAllByText("Testnet").length).toBeGreaterThan(0);
		});

		it("should apply correct styles to mainnet badge", () => {
			render(<WalletTable wallets={mockWallets} />);
			const mainnetBadge = screen.getAllByText("Mainnet")[0].parentElement;
			expect(mainnetBadge).toHaveClass("bg-blue-100");
			expect(mainnetBadge).toHaveClass("text-blue-800");
		});

		it("should apply correct styles to testnet badge", () => {
			render(<WalletTable wallets={mockWallets} />);
			const testnetBadge = screen.getAllByText("Testnet")[0].parentElement;
			expect(testnetBadge).toHaveClass("bg-amber-100");
			expect(testnetBadge).toHaveClass("text-amber-800");
		});
	});

	describe("StatusIndicator integration", () => {
		it("should display status indicator for each wallet", () => {
			render(<WalletTable wallets={mockWallets} />);
			expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
			expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
		});

		it("should apply correct styles to active status", () => {
			render(<WalletTable wallets={mockWallets} />);
			const activeBadge = screen.getAllByText("Active")[0].parentElement;
			expect(activeBadge).toHaveClass("bg-green-50");
			expect(activeBadge).toHaveClass("text-green-700");
		});

		it("should apply correct styles to pending status", () => {
			render(<WalletTable wallets={mockWallets} />);
			const pendingBadge = screen.getAllByText("Pending")[0].parentElement;
			expect(pendingBadge).toHaveClass("bg-yellow-50");
			expect(pendingBadge).toHaveClass("text-yellow-700");
		});
	});

	describe("Empty state", () => {
		it("should render empty-state message and no table when wallets is empty", () => {
			render(<WalletTable wallets={[]} />);
			expect(screen.queryByRole("table")).not.toBeInTheDocument();
			expect(
				screen.getByText("No wallets found for this network."),
			).toBeInTheDocument();
		});
	});

	describe("Data display", () => {
		it("should display wallet balance", () => {
			render(<WalletTable wallets={mockWallets} />);
			expect(screen.getAllByText("1,250.50 XLM").length).toBeGreaterThan(0);
			expect(screen.getAllByText("500.00 XLM").length).toBeGreaterThan(0);
		});

		it("should display dash for missing balance", () => {
			const walletsWithoutBalance: Wallet[] = [
				{
					...mockWallets[0],
					balance: undefined,
				},
			];
			render(<WalletTable wallets={walletsWithoutBalance} />);
			expect(screen.getAllByText("—").length).toBeGreaterThan(0);
		});

		it("should display truncated address", () => {
			render(<WalletTable wallets={mockWallets} />);
			// Address should be truncated (first 6 + ... + last 4 chars)
			expect(screen.getAllByText("GBZXN7...MADI").length).toBeGreaterThan(0);
		});
	});

	describe("Responsive design", () => {
		it("should render all columns in the desktop table", () => {
			const { container } = render(<WalletTable wallets={mockWallets} />);
			const headers = container.querySelectorAll("th");
			expect(headers.length).toBe(6); // Address, Network, Status, Balance, Created, Last Activity
		});

		it("should wrap the desktop table in a hidden-lg container", () => {
			const { container } = render(<WalletTable wallets={mockWallets} />);
			const desktopWrapper = container.querySelector(".hidden.lg\\:block");
			expect(desktopWrapper).toBeInTheDocument();
		});

		it("should render a mobile card container", () => {
			const { container } = render(<WalletTable wallets={mockWallets} />);
			const mobileWrapper = container.querySelector(".lg\\:hidden");
			expect(mobileWrapper).toBeInTheDocument();
		});
	});

	describe("Edge cases", () => {
		it("should handle single wallet", () => {
			render(<WalletTable wallets={[mockWallets[0]]} />);
			expect(screen.getAllByText("Mainnet").length).toBeGreaterThan(0);
			expect(screen.queryAllByText("Testnet")).toHaveLength(0);
		});

		it("should handle multiple wallets with same network", () => {
			const sameNetworkWallets: Wallet[] = [
				mockWallets[0],
				{
					...mockWallets[1],
					network: "mainnet",
				},
			];
			render(<WalletTable wallets={sameNetworkWallets} />);
			// 2 mainnet wallets × 2 views = 4 "Mainnet" labels
			const mainnetBadges = screen.getAllByText("Mainnet");
			expect(mainnetBadges.length).toBe(4);
		});

		it("should handle multiple wallets with same status", () => {
			const sameStatusWallets: Wallet[] = [
				mockWallets[0],
				{
					...mockWallets[1],
					status: "active",
				},
			];
			render(<WalletTable wallets={sameStatusWallets} />);
			// 2 active wallets × 2 views = 4 "Active" labels
			const activeBadges = screen.getAllByText("Active");
			expect(activeBadges.length).toBe(4);
		});

		it("should handle wallet with missing lastActivity", () => {
			const walletsWithoutLastActivity: Wallet[] = [
				{
					...mockWallets[0],
					lastActivity: undefined,
				},
			];
			render(<WalletTable wallets={walletsWithoutLastActivity} />);
			expect(screen.getByRole("table")).toBeInTheDocument();
		});

		it("should handle wallet with all optional fields missing", () => {
			const minimalWallet: Wallet[] = [
				{
					id: "wallet-minimal",
					address: "GMINIMAL7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNA",
					network: "testnet",
					status: "inactive",
					createdAt: new Date(),
				},
			];
			render(<WalletTable wallets={minimalWallet} />);
			expect(screen.getAllByText("Testnet").length).toBeGreaterThan(0);
			expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
		});
	});

	describe("Accessibility", () => {
		it("should have proper table semantics", () => {
			const { container } = render(<WalletTable wallets={mockWallets} />);
			expect(container.querySelector("table")).toBeInTheDocument();
			expect(container.querySelector("thead")).toBeInTheDocument();
			expect(container.querySelector("tbody")).toBeInTheDocument();
		});

		it("should have proper row structure", () => {
			const { container } = render(<WalletTable wallets={mockWallets} />);
			const rows = container.querySelectorAll("tbody tr");
			expect(rows.length).toBe(mockWallets.length);
		});

		it("should have proper cell structure", () => {
			const { container } = render(<WalletTable wallets={mockWallets} />);
			const cells = container.querySelectorAll("tbody td");
			expect(cells.length).toBeGreaterThan(0);
		});
	});

	describe("Styling", () => {
		it("should apply container styles", () => {
			const { container } = render(<WalletTable wallets={mockWallets} />);
			// The outer wrapper is space-y-4; the inner card has rounded-xl
			const card = container.querySelector(".rounded-xl.border");
			expect(card).toBeInTheDocument();
			expect(card?.className).toContain("bg-white");
		});

		it("should apply dark mode styles to container", () => {
			const { container } = render(<WalletTable wallets={mockWallets} />);
			const card = container.querySelector(".rounded-xl.border");
			expect(card?.className).toContain("dark:border-zinc-800");
			expect(card?.className).toContain("dark:bg-zinc-900");
		});

		it("should apply header row styles", () => {
			const { container } = render(<WalletTable wallets={mockWallets} />);
			const headerRow = container.querySelector("thead tr");
			expect(headerRow).toHaveClass("hover:bg-transparent");
			expect(headerRow).toHaveClass("dark:hover:bg-transparent");
		});
	});
});
