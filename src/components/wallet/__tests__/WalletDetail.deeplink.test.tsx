import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletDetail } from "@/components/wallet/WalletDetail";
import type { WalletBalanceState } from "@/hooks/useWalletBalance";

const mockRefresh = vi.fn();

const baseState: WalletBalanceState = {
	wallet: {
		id: "wallet-001",
		address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
		network: "mainnet",
		status: "active",
		createdAt: new Date("2024-01-15T10:30:00Z"),
		balance: "1250.50 XLM",
	},
	balance: "1250.50 XLM",
	loading: false,
	error: null,
	lastUpdated: new Date("2024-01-20T14:22:00Z"),
	refresh: mockRefresh,
};

vi.mock("@/hooks/useWalletBalance", () => ({
	useWalletBalance: vi.fn(),
}));

Object.assign(navigator, {
	clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

import { useWalletBalance } from "@/hooks/useWalletBalance";

describe("WalletDetail deep link", () => {
	beforeEach(() => {
		vi.mocked(useWalletBalance).mockReturnValue(baseState);
		mockRefresh.mockClear();
	});

	it("renders wallet detail for a valid id param", () => {
		render(<WalletDetail id="wallet-001" />);
		expect(useWalletBalance).toHaveBeenCalledWith("wallet-001");
		expect(screen.getByText("1250.50 XLM")).toBeInTheDocument();
	});

	it("shows an invalid-link error state when id is empty", () => {
		render(<WalletDetail id="" />);
		expect(screen.getByText("Invalid wallet link")).toBeInTheDocument();
	});

	it("shows an invalid-link error state when id is only whitespace", () => {
		render(<WalletDetail id="   " />);
		expect(screen.getByText("Invalid wallet link")).toBeInTheDocument();
	});

	it("copies a shareable deep link when the copy-link button is clicked", async () => {
		render(<WalletDetail id="wallet-001" />);
		const button = screen.getByTestId("copy-wallet-link-button");
		fireEvent.click(button);

		await waitFor(() => {
			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
				expect.stringContaining("/dashboard/wallets/wallet-001"),
			);
		});
	});
});
