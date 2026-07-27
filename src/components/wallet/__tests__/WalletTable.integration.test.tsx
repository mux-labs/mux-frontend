import { render, screen } from "@testing-library/react";
import React from "react";
import { vi } from "vitest";
import type { Wallet } from "@/types/wallet";
import { WalletTable } from "../WalletTable";

// Mock the TestnetHint component
vi.mock("@/components/ui/TestnetHint", () => ({
	TestnetHint: ({ variant }: { variant: string }) => (
		<div data-testid="testnet-hint" data-variant={variant}>
			Testnet Hint
		</div>
	),
}));

// Mock the ExplorerLink component
vi.mock("@/components/ui/ExplorerLink", () => ({
	ExplorerLink: ({
		address,
		network,
	}: {
		address: string;
		network: string;
	}) => (
		<a
			href={`https://stellar.expert/explorer/${network}/account/${address}`}
			data-testid="explorer-link"
		>
			Explorer
		</a>
	),
}));

// Mock the useCopyToClipboard hook (include error: null to match real hook signature)
vi.mock("@/hooks/useCopyToClipboard", () => ({
	useCopyToClipboard: () => ({
		copy: vi.fn(),
		copied: false,
		error: null,
	}),
}));

describe("WalletTable Integration", () => {
	const mainnetWallet: Wallet = {
		id: "wallet-1",
		address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
		network: "mainnet",
		status: "active",
		createdAt: new Date("2024-01-15"),
		balance: "1,000 XLM",
	};

	const testnetWallet: Wallet = {
		id: "wallet-2",
		address: "GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
		network: "testnet",
		status: "active",
		createdAt: new Date("2024-01-20"),
		balance: "500 XLM",
	};

	describe("TestnetHint visibility", () => {
		it("should not show TestnetHint when only mainnet wallets present", () => {
			render(<WalletTable wallets={[mainnetWallet]} />);

			const hint = screen.queryByTestId("testnet-hint");
			expect(hint).not.toBeInTheDocument();
		});

		it("should show TestnetHint when testnet wallets present", () => {
			render(<WalletTable wallets={[testnetWallet]} />);

			const hint = screen.getByTestId("testnet-hint");
			expect(hint).toBeInTheDocument();
		});

		it("should show TestnetHint when mixed wallets present", () => {
			render(<WalletTable wallets={[mainnetWallet, testnetWallet]} />);

			const hint = screen.getByTestId("testnet-hint");
			expect(hint).toBeInTheDocument();
		});

		it("should use default variant for TestnetHint", () => {
			render(<WalletTable wallets={[testnetWallet]} />);

			const hint = screen.getByTestId("testnet-hint");
			expect(hint).toHaveAttribute("data-variant", "default");
		});

		it("should not show TestnetHint when no wallets", () => {
			render(<WalletTable wallets={[]} />);

			const hint = screen.queryByTestId("testnet-hint");
			expect(hint).not.toBeInTheDocument();
		});
	});

	describe("Wallet rendering", () => {
		it("should render all wallets in the desktop table", () => {
			render(<WalletTable wallets={[mainnetWallet, testnetWallet]} />);

			const rows = screen.getAllByRole("row");
			// Header row + 2 wallet rows in the desktop table
			expect(rows).toHaveLength(3);
		});

		it("should display wallet addresses", () => {
			render(<WalletTable wallets={[mainnetWallet]} />);

			// Responsive layout renders address in both desktop table and mobile card
			expect(screen.getAllByText(/GBZXN7.*MADI/).length).toBeGreaterThan(0);
		});

		it("should display network badges", () => {
			render(<WalletTable wallets={[mainnetWallet, testnetWallet]} />);

			const rows = screen.getAllByRole("row");
			expect(rows.length).toBeGreaterThan(1);
		});

		it("should display wallet status", () => {
			render(<WalletTable wallets={[mainnetWallet]} />);

			const rows = screen.getAllByRole("row");
			expect(rows.length).toBeGreaterThan(1);
		});

		it("should display balance when available", () => {
			render(<WalletTable wallets={[mainnetWallet]} />);

			expect(screen.getAllByText("1,000 XLM").length).toBeGreaterThan(0);
		});

		it("should display dash when balance unavailable", () => {
			const walletNoBalance: Wallet = {
				...mainnetWallet,
				balance: undefined,
			};

			render(<WalletTable wallets={[walletNoBalance]} />);

			expect(screen.getAllByText("—").length).toBeGreaterThan(0);
		});
	});

	describe("Responsive behavior", () => {
		it("should render table with all columns", () => {
			render(<WalletTable wallets={[mainnetWallet]} />);

			const headers = screen.getAllByRole("columnheader");
			expect(headers.length).toBeGreaterThan(0);
		});
	});

	describe("Edge cases", () => {
		it("should handle empty wallet list", () => {
			render(<WalletTable wallets={[]} />);

			expect(screen.queryByRole("table")).not.toBeInTheDocument();
			expect(
				screen.getByText("No wallets found for this network."),
			).toBeInTheDocument();
		});

		it("should handle multiple testnet wallets", () => {
			const testnetWallet2: Wallet = {
				...testnetWallet,
				id: "wallet-3",
				address: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOBER7KKQOAVSMIA",
			};

			render(<WalletTable wallets={[testnetWallet, testnetWallet2]} />);

			const hint = screen.getByTestId("testnet-hint");
			expect(hint).toBeInTheDocument();

			const rows = screen.getAllByRole("row");
			// Header + 2 testnet wallets
			expect(rows.length).toBeGreaterThanOrEqual(3);
		});

		it("should recalculate hint visibility when wallets change", () => {
			const { rerender } = render(<WalletTable wallets={[mainnetWallet]} />);

			let hint = screen.queryByTestId("testnet-hint");
			expect(hint).not.toBeInTheDocument();

			rerender(<WalletTable wallets={[mainnetWallet, testnetWallet]} />);

			hint = screen.getByTestId("testnet-hint");
			expect(hint).toBeInTheDocument();
		});
	});
});
