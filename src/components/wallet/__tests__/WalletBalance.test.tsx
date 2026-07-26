import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { WalletBalance } from "../WalletBalance";
import * as useBalanceVisibilityModule from "@/hooks/useBalanceVisibility";

vi.mock("@/hooks/useBalanceVisibility", () => ({
	useBalanceVisibility: vi.fn(),
}));

const mockUseBalanceVisibility =
	useBalanceVisibilityModule.useBalanceVisibility as any;

describe("WalletBalance", () => {
	const defaultHookReturn = {
		isVisible: false,
		toggleVisibility: vi.fn(),
		isInitialized: true,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseBalanceVisibility.mockReturnValue(defaultHookReturn);
	});

	it("renders loading state when not initialized", () => {
		mockUseBalanceVisibility.mockReturnValue({
			...defaultHookReturn,
			isInitialized: false,
		});
		const { container } = render(<WalletBalance balance={1000} />);
		expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
	});

	it("renders loading state when isLoading is true", () => {
		const { container } = render(
			<WalletBalance balance={1000} isLoading={true} />,
		);
		expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
	});

	it("renders error state when isError is true", () => {
		render(<WalletBalance balance={1000} isError={true} />);
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Failed to load balance",
		);
	});

	it("renders masked balance by default", () => {
		render(<WalletBalance balance={1000} />);
		expect(screen.getByTestId("balance-display")).toHaveTextContent("••••••");
		expect(
			screen.getByRole("button", { name: /show balance/i }),
		).toBeInTheDocument();
	});

	it("renders unmasked balance when isVisible is true", () => {
		mockUseBalanceVisibility.mockReturnValue({
			...defaultHookReturn,
			isVisible: true,
		});
		render(<WalletBalance balance={1000.5} />);

		// Testing specific currency formatting
		expect(screen.getByTestId("balance-display")).toHaveTextContent(
			"$1,000.50",
		);
		expect(
			screen.getByRole("button", { name: /hide balance/i }),
		).toBeInTheDocument();
	});

	it("renders unmasked balance correctly with custom currency", () => {
		mockUseBalanceVisibility.mockReturnValue({
			...defaultHookReturn,
			isVisible: true,
		});
		render(<WalletBalance balance={1000} currency="EUR" />);

		// Check that it's rendered as EUR. Note: Exact format depends on Intl environment.
		const balanceText = screen.getByTestId("balance-display").textContent;
		expect(balanceText).toMatch(/1,000\.00/);
		expect(balanceText).toContain("€");
	});

	it("calls toggleVisibility when the toggle button is clicked", () => {
		const toggleSpy = vi.fn();
		mockUseBalanceVisibility.mockReturnValue({
			...defaultHookReturn,
			toggleVisibility: toggleSpy,
		});
		render(<WalletBalance balance={1000} />);

		fireEvent.click(screen.getByRole("button", { name: /show balance/i }));
		expect(toggleSpy).toHaveBeenCalledOnce();
	});

	it("hides toggle button and masks balance when not allowed", () => {
		render(<WalletBalance balance={1000} isAllowed={false} />);
		expect(screen.getByTestId("balance-display")).toHaveTextContent("••••••");
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("renders N/A for invalid or null balances", () => {
		const { rerender } = render(<WalletBalance balance={null} />);
		expect(screen.getByTestId("balance-display")).toHaveTextContent("N/A");
		expect(screen.queryByRole("button")).not.toBeInTheDocument();

		rerender(<WalletBalance balance={undefined} />);
		expect(screen.getByTestId("balance-display")).toHaveTextContent("N/A");

		rerender(<WalletBalance balance="invalid_number" />);
		expect(screen.getByTestId("balance-display")).toHaveTextContent("N/A");
	});
});
