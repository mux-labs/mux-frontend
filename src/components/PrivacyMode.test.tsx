import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PrivacyMode } from "./PrivacyMode";

afterEach(cleanup);

const balances = [
	{ name: "Lumens", amount: 1234.56, symbol: "XLM" },
	{ name: "USD Coin", amount: 789.01, symbol: "USDC" },
];

describe("PrivacyMode", () => {
	it("renders amounts initially", () => {
		render(<PrivacyMode balances={balances} isAuthenticated={true} />);

		expect(screen.getByText("1234.56 XLM")).toBeTruthy();
		expect(screen.getByText("789.01 USDC")).toBeTruthy();
	});

	it("hides every balance amount and symbol from the DOM when toggled", () => {
		const { container } = render(
			<PrivacyMode balances={balances} isAuthenticated={true} />,
		);

		fireEvent.click(screen.getByRole("button"));

		expect(container.textContent).toContain("****");
		for (const balance of balances) {
			expect(container.textContent).not.toContain(String(balance.amount));
			expect(container.textContent).not.toContain(balance.symbol);
		}
	});

	it("toggles the button label between Hide Balances and Show Balances", () => {
		render(<PrivacyMode balances={balances} isAuthenticated={true} />);

		const button = screen.getByRole("button");
		expect(button.textContent).toBe("Hide Balances");

		fireEvent.click(button);
		expect(button.textContent).toBe("Show Balances");

		fireEvent.click(button);
		expect(button.textContent).toBe("Hide Balances");
	});

	it("keeps a stable aria-label in both states", () => {
		render(<PrivacyMode balances={balances} isAuthenticated={true} />);

		const button = screen.getByRole("button", {
			name: "Toggle balance privacy",
		});
		expect(button.getAttribute("aria-label")).toBe("Toggle balance privacy");

		fireEvent.click(button);
		expect(button.getAttribute("aria-label")).toBe("Toggle balance privacy");
	});

	it("shows the privacy hint paragraph only while hidden", () => {
		render(<PrivacyMode balances={balances} isAuthenticated={true} />);

		expect(screen.queryByText(/hidden for privacy/i)).toBeNull();

		fireEvent.click(screen.getByRole("button"));
		expect(screen.getByText(/hidden for privacy/i)).toBeTruthy();

		fireEvent.click(screen.getByRole("button"));
		expect(screen.queryByText(/hidden for privacy/i)).toBeNull();
	});
});
