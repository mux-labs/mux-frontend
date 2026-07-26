import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Wallet } from "@/types/wallet";
import { WalletTable } from "./WalletTable";

const mockWallets: Wallet[] = [
	{
		id: "w-1",
		address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
		network: "mainnet",
		status: "active",
		createdAt: new Date("2024-01-15"),
		balance: "1,250.50 XLM",
	},
	{
		id: "w-2",
		address: "GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
		network: "testnet",
		status: "pending",
		createdAt: new Date("2024-02-20"),
	},
];

describe("WalletTable", () => {
	it("renders a row for each wallet", () => {
		render(<WalletTable wallets={mockWallets} />);
		// Each wallet address is truncated; check for the truncated prefix
		expect(screen.getByText("GBZXN7...MADI")).toBeInTheDocument();
		expect(screen.getByText("GCFONE...3YPE")).toBeInTheDocument();
	});

	it("shows the wallet count in the header", () => {
		render(<WalletTable wallets={mockWallets} />);
		expect(screen.getByText("2 wallets")).toBeInTheDocument();
	});

	it("uses singular 'wallet' when there is exactly one", () => {
		render(<WalletTable wallets={[mockWallets[0]]} />);
		expect(screen.getByText("1 wallet")).toBeInTheDocument();
	});

	it("renders network badges", () => {
		render(<WalletTable wallets={mockWallets} />);
		expect(screen.getByText("Mainnet")).toBeInTheDocument();
		expect(screen.getByText("Testnet")).toBeInTheDocument();
	});

	it("renders status indicators", () => {
		render(<WalletTable wallets={mockWallets} />);
		expect(screen.getByText("Active")).toBeInTheDocument();
		expect(screen.getByText("Pending")).toBeInTheDocument();
	});

	it("shows balance when provided, dash when absent", () => {
		render(<WalletTable wallets={mockWallets} />);
		expect(screen.getByText("1,250.50 XLM")).toBeInTheDocument();
		expect(screen.getByText("—")).toBeInTheDocument();
	});

	it("renders the Add Wallet button when onAddWallet is provided", () => {
		render(<WalletTable wallets={mockWallets} onAddWallet={vi.fn()} />);
		expect(
			screen.getByRole("button", { name: /add wallet/i }),
		).toBeInTheDocument();
	});

	it("does not render the Add Wallet button when onAddWallet is omitted", () => {
		render(<WalletTable wallets={mockWallets} />);
		expect(
			screen.queryByRole("button", { name: /add wallet/i }),
		).not.toBeInTheDocument();
	});

	it("calls onAddWallet when the Add Wallet button is clicked", async () => {
		const user = userEvent.setup();
		const onAddWallet = vi.fn();
		render(<WalletTable wallets={mockWallets} onAddWallet={onAddWallet} />);
		await user.click(screen.getByRole("button", { name: /add wallet/i }));
		expect(onAddWallet).toHaveBeenCalledOnce();
	});

	it("applies dark-mode styles to the table surface and header", () => {
		const { container } = render(<WalletTable wallets={mockWallets} />);

		const surface = container.querySelector(".dark\\:border-zinc-700");
		const headerRow = container.querySelector("thead tr");

		expect(surface).toHaveClass("dark:bg-zinc-900");
		expect(headerRow).toHaveClass("dark:bg-zinc-800/70");
		expect(headerRow).toHaveClass("dark:border-zinc-700");
	});
});
