import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("WalletDetail archive confirm", () => {
	beforeEach(() => {
		vi.mocked(useWalletBalance).mockReturnValue(baseState);
		mockRefresh.mockClear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("opens a confirmation dialog before archiving", () => {
		render(<WalletDetail id="wallet-001" />);
		fireEvent.click(screen.getByTestId("archive-wallet-button"));
		expect(screen.getByTestId("confirm-archive-dialog")).toBeInTheDocument();
		expect(screen.getByText("Archive wallet?")).toBeInTheDocument();
	});

	it("does not archive when the dialog is cancelled", () => {
		vi.stubGlobal("fetch", vi.fn());
		render(<WalletDetail id="wallet-001" />);
		fireEvent.click(screen.getByTestId("archive-wallet-button"));
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(
			screen.queryByTestId("confirm-archive-dialog"),
		).not.toBeInTheDocument();
		expect(fetch).not.toHaveBeenCalled();
	});

	it("archives the wallet and shows the Archived badge on confirm", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
		);
		render(<WalletDetail id="wallet-001" />);
		fireEvent.click(screen.getByTestId("archive-wallet-button"));
		fireEvent.click(screen.getByRole("button", { name: "Archive wallet" }));

		await waitFor(() =>
			expect(fetch).toHaveBeenCalledWith(
				"/api/wallets/wallet-001",
				expect.objectContaining({
					method: "PATCH",
					body: JSON.stringify({ archived: true }),
				}),
			),
		);
		await waitFor(() =>
			expect(screen.getByText("Archived")).toBeInTheDocument(),
		);
		expect(
			screen.queryByTestId("archive-wallet-button"),
		).not.toBeInTheDocument();
	});

	it("shows an error and keeps the dialog open when the archive request fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: false, status: 500 }),
		);
		render(<WalletDetail id="wallet-001" />);
		fireEvent.click(screen.getByTestId("archive-wallet-button"));
		fireEvent.click(screen.getByRole("button", { name: "Archive wallet" }));

		await waitFor(() =>
			expect(screen.getByText("Unable to archive wallet")).toBeInTheDocument(),
		);
		expect(screen.getByTestId("confirm-archive-dialog")).toBeInTheDocument();
	});
});
