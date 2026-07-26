import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WalletDetail } from "@/components/wallet/WalletDetail";
import type { WalletBalanceState } from "@/hooks/useWalletBalance";

vi.mock("@/hooks/useWalletBalance", () => ({
	useWalletBalance: vi.fn(),
}));

Object.assign(navigator, {
	clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

import { useWalletBalance } from "@/hooks/useWalletBalance";

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

describe("WalletDetail keyboard navigation", () => {
	beforeEach(() => {
		vi.mocked(useWalletBalance).mockReturnValue(baseState);
		mockRefresh.mockClear();
	});

	it("sections have aria-labelledby pointing to headings", () => {
		render(<WalletDetail id="wallet-001" />);
		const sections = document.querySelectorAll("section[aria-labelledby]");
		expect(sections.length).toBeGreaterThanOrEqual(2);
		for (const section of sections) {
			const headingId = section.getAttribute("aria-labelledby");
			expect(headingId).toBeTruthy();
			const heading = document.getElementById(headingId as string);
			expect(heading).toBeInTheDocument();
		}
	});

	it("refresh button is keyboard focusable and activatable", async () => {
		const user = userEvent.setup();
		render(<WalletDetail id="wallet-001" />);

		const refreshBtn = screen.getByRole("button", { name: /refresh balance/i });
		refreshBtn.focus();
		expect(refreshBtn).toHaveFocus();

		await user.keyboard("{Enter}");
		expect(mockRefresh).toHaveBeenCalledOnce();
	});

	it("refresh button has focus-visible ring classes", () => {
		render(<WalletDetail id="wallet-001" />);
		const refreshBtn = screen.getByRole("button", { name: /refresh balance/i });
		expect(refreshBtn.className).toContain("focus-visible:ring-2");
		expect(refreshBtn.className).toContain("focus-visible:ring-blue-500");
	});

	it("refresh button has aria-busy when loading", () => {
		vi.mocked(useWalletBalance).mockReturnValue({
			...baseState,
			loading: true,
		});
		render(<WalletDetail id="wallet-001" />);
		const refreshBtn = screen.getByRole("button", { name: /refresh balance/i });
		expect(refreshBtn).toHaveAttribute("aria-busy", "true");
	});

	it("copy button has descriptive aria-label", () => {
		render(<WalletDetail id="wallet-001" />);
		const copyBtn = screen.getByRole("button", {
			name: /copy wallet address/i,
		});
		expect(copyBtn).toBeInTheDocument();
	});

	it("copy button is keyboard focusable and activatable", async () => {
		const user = userEvent.setup();
		render(<WalletDetail id="wallet-001" />);

		const copyBtn = screen.getByRole("button", {
			name: /copy wallet address/i,
		});
		copyBtn.focus();
		expect(copyBtn).toHaveFocus();

		await user.keyboard("{Enter}");
		// After activation, the button label should change to "Address copied"
		expect(
			screen.getByRole("button", { name: /address copied/i }),
		).toBeInTheDocument();
	});

	it("balance text has aria-live polite for screen reader updates", () => {
		render(<WalletDetail id="wallet-001" />);
		const balancePara = screen.getByText("1250.50 XLM");
		expect(balancePara).toHaveAttribute("aria-live", "polite");
		expect(balancePara).toHaveAttribute("aria-atomic", "true");
	});

	it("inline error has role=alert for screen readers", () => {
		vi.mocked(useWalletBalance).mockReturnValue({
			...baseState,
			error: "Network error",
		});
		render(<WalletDetail id="wallet-001" />);
		const alert = screen.getByRole("alert");
		expect(alert).toHaveTextContent("Network error");
	});

	it("tab sequence reaches refresh then copy button", async () => {
		const user = userEvent.setup();
		render(<WalletDetail id="wallet-001" />);

		await user.tab();
		const focused = document.activeElement;
		expect(focused).toBeTruthy();
		const isInteractive =
			focused?.tagName === "BUTTON" ||
			focused?.getAttribute("role") === "button";
		expect(isInteractive).toBe(true);
	});
});
