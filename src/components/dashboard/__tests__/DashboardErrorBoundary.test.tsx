import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardErrorBoundary } from "../DashboardErrorBoundary";

describe("DashboardErrorBoundary", () => {
	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("renders the error message and a retry action", () => {
		const reset = vi.fn();
		render(
			<DashboardErrorBoundary
				error={new Error("Failed to load wallets")}
				reset={reset}
			/>,
		);

		expect(screen.getByText("Failed to load wallets")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /try again/i }));
		expect(reset).toHaveBeenCalledTimes(1);
	});

	it("falls back to a generic message when the error has none", () => {
		render(<DashboardErrorBoundary error={new Error()} reset={() => {}} />);

		expect(
			screen.getByText(/something went wrong loading this part/i),
		).toBeInTheDocument();
	});

	it("logs the error for observability", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		render(
			<DashboardErrorBoundary error={new Error("boom")} reset={() => {}} />,
		);

		expect(spy).toHaveBeenCalledWith(
			"[DashboardErrorBoundary]",
			expect.any(Error),
		);
	});
});
