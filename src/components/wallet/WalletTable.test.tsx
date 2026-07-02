import { render, screen, waitFor } from "@testing-library/react";
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
		// Responsive layout renders both desktop table and mobile cards —
		// same truncated address may appear more than once.
		expect(screen.getAllByText("GBZXN7...MADI").length).toBeGreaterThan(0);
		expect(screen.getAllByText("GCFONE...3YPE").length).toBeGreaterThan(0);
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
		// Desktop + mobile both render badges, so multiple matches are expected.
		expect(screen.getAllByText("Mainnet").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Testnet").length).toBeGreaterThan(0);
	});

	it("renders status indicators", () => {
		render(<WalletTable wallets={mockWallets} />);
		expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
	});

	it("shows balance when provided, dash when absent", () => {
		render(<WalletTable wallets={mockWallets} />);
		expect(screen.getAllByText("1,250.50 XLM").length).toBeGreaterThan(0);
		expect(screen.getAllByText("—").length).toBeGreaterThan(0);
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

	describe("copy callbacks", () => {
		it("calls onCopySuccess with the full address after a successful copy", async () => {
			const user = userEvent.setup();
			const onCopySuccess = vi.fn();
			render(
				<WalletTable wallets={mockWallets} onCopySuccess={onCopySuccess} />,
			);

			// Click the first copy button (multiple rendered for desktop + mobile)
			const copyButtons = screen.getAllByTitle("Copy address");
			await user.click(copyButtons[0]);

			await waitFor(() =>
				expect(onCopySuccess).toHaveBeenCalledWith(mockWallets[0].address),
			);
		});

		it("does not throw when onCopySuccess is omitted", async () => {
			const user = userEvent.setup();
			render(<WalletTable wallets={[mockWallets[0]]} />);
			const copyButton = screen.getAllByTitle("Copy address")[0];
			await expect(user.click(copyButton)).resolves.not.toThrow();
		});

		it("does not throw when onCopyError is omitted", async () => {
			// Simulate clipboard failure
			vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
				new Error("Permission denied"),
			);
			const user = userEvent.setup();
			render(<WalletTable wallets={[mockWallets[0]]} />);
			const copyButton = screen.getAllByTitle("Copy address")[0];
			await expect(user.click(copyButton)).resolves.not.toThrow();
		});

		it("calls onCopyError when clipboard write fails", async () => {
			vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
				new Error("Permission denied"),
			);
			const user = userEvent.setup();
			const onCopyError = vi.fn();
			render(
				<WalletTable wallets={[mockWallets[0]]} onCopyError={onCopyError} />,
			);

			const copyButton = screen.getAllByTitle("Copy address")[0];
			await user.click(copyButton);

			await waitFor(() => expect(onCopyError).toHaveBeenCalled());
		});
	});
});
