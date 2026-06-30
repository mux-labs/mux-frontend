import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
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

// Mock clipboard API
Object.assign(navigator, {
	clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

import { useWalletBalance } from "@/hooks/useWalletBalance";

describe("WalletDetail", () => {
	beforeEach(() => {
		vi.mocked(useWalletBalance).mockReturnValue(baseState);
		mockRefresh.mockClear();
	});

	it("renders live balance", () => {
		render(<WalletDetail id="wallet-001" />);
		expect(screen.getByText("1250.50 XLM")).toBeInTheDocument();
	});

	it("renders wallet metadata", () => {
		render(<WalletDetail id="wallet-001" />);
		expect(screen.getByText("GBZXN7...MADI")).toBeInTheDocument();
		expect(screen.getByText("Mainnet")).toBeInTheDocument();
		expect(screen.getByText("Active")).toBeInTheDocument();
	});

	it("calls refresh when button clicked", () => {
		render(<WalletDetail id="wallet-001" />);
		fireEvent.click(screen.getByRole("button", { name: /refresh balance/i }));
		expect(mockRefresh).toHaveBeenCalledOnce();
	});

	it("shows skeleton when loading with no balance yet", () => {
		vi.mocked(useWalletBalance).mockReturnValue({
			...baseState,
			loading: true,
			balance: null,
			wallet: null,
		});
		render(<WalletDetail id="wallet-001" />);
		// Balance skeleton present, no balance text
		expect(screen.queryByText("1250.50 XLM")).not.toBeInTheDocument();
	});

	it("shows error state when error and no wallet", () => {
		vi.mocked(useWalletBalance).mockReturnValue({
			...baseState,
			error: "Wallet not found",
			wallet: null,
			balance: null,
		});
		render(<WalletDetail id="bad-id" />);
		expect(screen.getByText("Wallet not found")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
	});

	it("shows inline error when error but wallet already loaded", () => {
		vi.mocked(useWalletBalance).mockReturnValue({
			...baseState,
			error: "Network error",
		});
		render(<WalletDetail id="wallet-001" />);
		expect(screen.getByText("Network error")).toBeInTheDocument();
		// Still shows the last known balance
		expect(screen.getByText("1250.50 XLM")).toBeInTheDocument();
	});

	it("disables refresh button while loading", () => {
		vi.mocked(useWalletBalance).mockReturnValue({
			...baseState,
			loading: true,
		});
		render(<WalletDetail id="wallet-001" />);
		expect(
			screen.getByRole("button", { name: /refresh balance/i }),
		).toBeDisabled();
	});
});
