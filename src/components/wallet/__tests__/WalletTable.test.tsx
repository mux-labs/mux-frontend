import { render, screen } from "@testing-library/react";
import type { Wallet } from "@/types/wallet";
import { WalletTable } from "../WalletTable";

// Mock the useCopyToClipboard hook
jest.mock("@/hooks/useCopyToClipboard", () => ({
	useCopyToClipboard: () => ({
		copy: jest.fn(),
		copied: false,
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
			expect(screen.getByText("Mainnet")).toBeInTheDocument();
			expect(screen.getByText("Testnet")).toBeInTheDocument();
		});
	});

	describe("NetworkBadge integration", () => {
		it("should display network badge for each wallet", () => {
			render(<WalletTable wallets={mockWallets} />);
			const mainnetBadges = screen.getAllByText("Mainnet");
			const testnetBadges = screen.getAllByText("Testnet");

			expect(mainnetBadges.length).toBeGreaterThan(0);
			expect(testnetBadges.length).toBeGreaterThan(0);
		});

		it("should apply correct styles to mainnet badge", () => {
			render(<WalletTable wallets={mockWallets} />);
			const mainnetBadge = screen.getByText("Mainnet").parentElement;
			expect(mainnetBadge).toHaveClass("bg-blue-100");
			expect(mainnetBadge).toHaveClass("text-blue-800");
		});

		it("should apply correct styles to testnet badge", () => {
			render(<WalletTable wallets={mockWallets} />);
			const testnetBadge = screen.getByText("Testnet").parentElement;
			expect(testnetBadge).toHaveClass("bg-amber-100");
			expect(testnetBadge).toHaveClass("text-amber-800");
		});
	});

	describe("StatusIndicator integration", () => {
		it("should display status indicator for each wallet", () => {
			render(<WalletTable wallets={mockWallets} />);
			expect(screen.getByText("Active")).toBeInTheDocument();
			expect(screen.getByText("Pending")).toBeInTheDocument();
		});

		it("should apply correct styles to active status", () => {
			render(<WalletTable wallets={mockWallets} />);
			const activeBadge = screen.getByText("Active").parentElement;
			expect(activeBadge).toHaveClass("bg-green-50");
			expect(activeBadge).toHaveClass("text-green-700");
		});

		it("should apply correct styles to pending status", () => {
			render(<WalletTable wallets={mockWallets} />);
			const pendingBadge = screen.getByText("Pending").parentElement;
			expect(pendingBadge).toHaveClass("bg-yellow-50");
			expect(pendingBadge).toHaveClass("text-yellow-700");
		});
	});

	describe("Empty state", () => {
		it("should render table with empty body when no wallets", () => {
			render(<WalletTable wallets={[]} />);
			expect(screen.getByRole("table")).toBeInTheDocument();
			const rows = screen.queryAllByRole("row");
			// Only header row should exist
			expect(rows.length).toBe(1);
		});
	});

	describe("Data display", () => {
		it("should display wallet balance", () => {
			render(<WalletTable wallets={mockWallets} />);
			expect(screen.getByText("1,250.50 XLM")).toBeInTheDocument();
			expect(screen.getByText("500.00 XLM")).toBeInTheDocument();
		});

		it("should display dash for missing balance", () => {
			const walletsWithoutBalance: Wallet[] = [
				{
					...mockWallets[0],
					balance: undefined,
				},
			];
			render(<WalletTable wallets={walletsWithoutBalance} />);
			expect(screen.getByText("—")).toBeInTheDocument();
		});

		it("should display truncated address", () => {
			render(<WalletTable wallets={mockWallets} />);
			// Address should be truncated (first 6 + ... + last 4 chars)
			expect(screen.getByText("GBZXN7...MADI")).toBeInTheDocument();
		});
	});

	describe("Responsive design", () => {
		it("should render all columns in table", () => {
			const { container } = render(<WalletTable wallets={mockWallets} />);
			const headers = container.querySelectorAll("th");
			expect(headers.length).toBe(6); // Address, Network, Status, Balance, Created, Last Activity
		});

		it("should have responsive classes on balance column", () => {
			const { container } = render(<WalletTable wallets={mockWallets} />);
			const balanceHeader = Array.from(container.querySelectorAll("th")).find(
				(th) => th.textContent === "Balance",
			);
			expect(balanceHeader).toHaveClass("hidden");
			expect(balanceHeader).toHaveClass("sm:table-cell");
		});

		it("should have responsive classes on created column", () => {
			const { container } = render(<WalletTable wallets={mockWallets} />);
			const createdHeader = Array.from(container.querySelectorAll("th")).find(
				(th) => th.textContent === "Created",
			);
			expect(createdHeader).toHaveClass("hidden");
			expect(createdHeader).toHaveClass("md:table-cell");
		});

		it("should have responsive classes on last activity column", () => {
			const { container } = render(<WalletTable wallets={mockWallets} />);
			const lastActivityHeader = Array.from(
				container.querySelectorAll("th"),
			).find((th) => th.textContent === "Last Activity");
			expect(lastActivityHeader).toHaveClass("hidden");
			expect(lastActivityHeader).toHaveClass("lg:table-cell");
		});
	});

	describe("Edge cases", () => {
		it("should handle single wallet", () => {
			render(<WalletTable wallets={[mockWallets[0]]} />);
			expect(screen.getByText("Mainnet")).toBeInTheDocument();
			expect(screen.queryByText("Testnet")).not.toBeInTheDocument();
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
			const mainnetBadges = screen.getAllByText("Mainnet");
			expect(mainnetBadges.length).toBe(2);
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
			const activeBadges = screen.getAllByText("Active");
			expect(activeBadges.length).toBe(2);
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
					address: "GMINIMAL",
					network: "testnet",
					status: "inactive",
					createdAt: new Date(),
				},
			];
			render(<WalletTable wallets={minimalWallet} />);
			expect(screen.getByText("Testnet")).toBeInTheDocument();
			expect(screen.getByText("Inactive")).toBeInTheDocument();
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
			const wrapper = container.querySelector(".rounded-xl.border");
			expect(wrapper).toHaveClass("rounded-xl");
			expect(wrapper).toHaveClass("border");
			expect(wrapper).toHaveClass("bg-white");
		});

		it("should apply dark mode styles to container", () => {
			const { container } = render(<WalletTable wallets={mockWallets} />);
			const wrapper = container.querySelector(".rounded-xl.border");
			expect(wrapper).toHaveClass("dark:border-zinc-700");
			expect(wrapper).toHaveClass("dark:bg-zinc-900");
		});

		it("should apply header row styles", () => {
			const { container } = render(<WalletTable wallets={mockWallets} />);
			const headerRow = container.querySelector("thead tr");
			expect(headerRow).toHaveClass("bg-zinc-50/80");
			expect(headerRow).toHaveClass("dark:bg-zinc-800/70");
			expect(headerRow).toHaveClass("dark:border-zinc-700");
		});
	});
});
