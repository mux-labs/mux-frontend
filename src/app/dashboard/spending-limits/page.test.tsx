import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SpendingLimitsPage from "./page";

describe("Dashboard SpendingLimitsPage", () => {
	it("renders the billing details link placeholder", () => {
		render(<SpendingLimitsPage />);

		const billingLink = screen.getByRole("link", {
			name: /view billing details/i,
		});

		expect(billingLink).toHaveAttribute("href", "#");
	});
});
