import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WalletDetail } from "@/components/wallet/WalletDetail";
import type { WalletBalanceState } from "@/hooks/useWalletBalance";

vi.mock("@/hooks/useWalletBalance", () => ({
	useWalletBalance: vi.fn(),
}));

// Mock the underlying copy utility so we can control success/failure
vi.mock("@/utils/copyToClipboard", () => ({
	copyToClipboard: vi.fn(),
}));

import { useWalletBalance } from "@/hooks/useWalletBalance";
import { copyToClipboard } from "@/utils/copyToClipboard";

const WALLET_ADDRESS =
	"GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";

const baseState: WalletBalanceState = {
	wallet: {
		id: "wallet-001",
		address: WALLET_ADDRESS,
		network: "mainnet",
		status: "active",
		createdAt: new Date("2024-01-15T10:30:00Z"),
		balance: "1250.50 XLM",
	},
	balance: "1250.50 XLM",
	loading: false,
	error: null,
	lastUpdated: new Date("2024-01-20T14:22:00Z"),
	refresh: vi.fn(),
};

beforeEach(() => {
	vi.mocked(useWalletBalance).mockReturnValue(baseState);
	vi.mocked(copyToClipboard).mockResolvedValue(undefined);
});

describe("WalletDetail copy-to-clipboard UX", () => {
	it("renders copy button for the wallet address", () => {
		render(<WalletDetail id="wallet-001" />);
		expect(
			screen.getByRole("button", { name: /copy wallet address/i }),
		).toBeInTheDocument();
	});

	it("copy button shows Copy icon initially", () => {
		render(<WalletDetail id="wallet-001" />);
		const copyBtn = screen.getByRole("button", {
			name: /copy wallet address/i,
		});
		const svg = copyBtn.querySelector("svg");
		expect(svg).toBeInTheDocument();
	});

	it("copies the full address (not truncated) on click", async () => {
		const user = userEvent.setup();
		render(<WalletDetail id="wallet-001" />);

		await user.click(
			screen.getByRole("button", { name: /copy wallet address/i }),
		);

		expect(copyToClipboard).toHaveBeenCalledWith(WALLET_ADDRESS);
	});

	it("changes aria-label to 'Address copied' after successful copy", async () => {
		const user = userEvent.setup();
		render(<WalletDetail id="wallet-001" />);

		await user.click(
			screen.getByRole("button", { name: /copy wallet address/i }),
		);

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /address copied/i }),
			).toBeInTheDocument();
		});
	});

	it("shows error state when clipboard write fails", async () => {
		vi.mocked(copyToClipboard).mockRejectedValue(new Error("Clipboard denied"));
		const user = userEvent.setup();
		render(<WalletDetail id="wallet-001" />);

		await user.click(
			screen.getByRole("button", { name: /copy wallet address/i }),
		);

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});
	});

	it("disables copy button when there is a clipboard error", async () => {
		vi.mocked(copyToClipboard).mockRejectedValue(
			new Error("Permission denied"),
		);
		const user = userEvent.setup();
		render(<WalletDetail id="wallet-001" />);

		await user.click(
			screen.getByRole("button", { name: /copy wallet address/i }),
		);

		await waitFor(() => {
			const btn = screen.getByRole("button", { name: /permission denied/i });
			expect(btn).toBeDisabled();
		});
	});

	it("does not render copy button when wallet is not loaded", () => {
		vi.mocked(useWalletBalance).mockReturnValue({
			...baseState,
			wallet: null,
			balance: null,
		});
		render(<WalletDetail id="wallet-001" />);
		expect(
			screen.queryByRole("button", { name: /copy wallet address/i }),
		).not.toBeInTheDocument();
	});
});
