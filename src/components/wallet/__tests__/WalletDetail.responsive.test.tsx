import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletDetail } from "@/components/wallet/WalletDetail";
import type { WalletBalanceState } from "@/hooks/useWalletBalance";

vi.mock("@/hooks/useWalletBalance", () => ({
	useWalletBalance: vi.fn(),
}));

Object.assign(navigator, {
	clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

import { useWalletBalance } from "@/hooks/useWalletBalance";

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
	refresh: vi.fn(),
};

describe("WalletDetail responsive layout", () => {
	beforeEach(() => {
		vi.mocked(useWalletBalance).mockReturnValue(baseState);
	});

	it("renders balance card with responsive padding classes", () => {
		const { container } = render(<WalletDetail id="wallet-001" />);
		const cards = container.querySelectorAll(".rounded-xl.border");
		expect(cards.length).toBeGreaterThanOrEqual(1);
		const balanceCard = cards[0];
		expect(balanceCard.className).toContain("p-4");
		expect(balanceCard.className).toContain("sm:p-6");
	});

	it("renders wallet info card with responsive padding classes", () => {
		const { container } = render(<WalletDetail id="wallet-001" />);
		const cards = container.querySelectorAll(".rounded-xl.border");
		expect(cards.length).toBeGreaterThanOrEqual(2);
		const infoCard = cards[1];
		expect(infoCard.className).toContain("p-4");
		expect(infoCard.className).toContain("sm:p-6");
	});

	it("renders dl rows with responsive flex direction", () => {
		const { container } = render(<WalletDetail id="wallet-001" />);
		const dlRows = container.querySelectorAll("dl > div");
		expect(dlRows.length).toBeGreaterThan(0);
		for (const row of dlRows) {
			expect(row.className).toContain("flex-col");
			expect(row.className).toContain("sm:flex-row");
		}
	});

	it("renders balance text with responsive size classes", () => {
		render(<WalletDetail id="wallet-001" />);
		const balanceText = screen.getByText("1250.50 XLM");
		expect(balanceText.className).toContain("text-3xl");
		expect(balanceText.className).toContain("sm:text-4xl");
	});

	it("renders address code with min-w-0 and truncate classes for overflow safety", () => {
		const { container } = render(<WalletDetail id="wallet-001" />);
		const addressCode = container.querySelector("code");
		expect(addressCode).toBeInTheDocument();
		expect(addressCode?.className).toContain("min-w-0");
		expect(addressCode?.className).toContain("truncate");
	});

	it("renders space-y-4 with sm:space-y-6 for responsive vertical spacing", () => {
		const { container } = render(<WalletDetail id="wallet-001" />);
		const outerDiv = container.firstChild as HTMLElement;
		expect(outerDiv.className).toContain("space-y-4");
		expect(outerDiv.className).toContain("sm:space-y-6");
	});

	it("renders skeleton with responsive size when loading without balance", () => {
		vi.mocked(useWalletBalance).mockReturnValue({
			...baseState,
			loading: true,
			balance: null,
			wallet: null,
		});
		const { container } = render(<WalletDetail id="wallet-001" />);
		const skeleton = container.querySelector(
			".animate-pulse, [class*='skeleton'], [class*='h-10']",
		);
		expect(skeleton).toBeInTheDocument();
	});
});
