import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Toast } from "./toast";

describe("Toast", () => {
	it("does not render when closed", () => {
		render(<Toast open={false} message="Saved" />);

		expect(screen.queryByText("Saved")).not.toBeInTheDocument();
	});

	it("announces non-error messages politely to screen readers", () => {
		render(<Toast open message="Spending limits saved." />);

		const toast = screen.getByRole("status");
		expect(toast).toHaveAttribute("aria-live", "polite");
		expect(toast).toHaveAttribute("aria-atomic", "true");
		expect(toast).toHaveTextContent("Success");
		expect(toast).toHaveTextContent("Spending limits saved.");
	});

	it("announces error messages assertively", () => {
		render(<Toast open tone="error" title="Error" message="Save failed." />);

		const toast = screen.getByRole("alert");
		expect(toast).toHaveAttribute("aria-live", "assertive");
		expect(toast).toHaveAttribute("aria-atomic", "true");
	});
});
