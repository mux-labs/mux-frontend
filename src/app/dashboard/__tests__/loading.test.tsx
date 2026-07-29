import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DashboardRouteLoading from "../loading";

describe("DashboardRouteLoading", () => {
	it("renders an accessible busy status region", () => {
		render(<DashboardRouteLoading />);

		const status = screen.getByRole("status", { name: /loading dashboard/i });
		expect(status).toHaveAttribute("aria-busy", "true");
		expect(status).toHaveAttribute("aria-live", "polite");
	});

	it("renders skeleton placeholders instead of empty content", () => {
		render(<DashboardRouteLoading />);

		expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
	});
});
