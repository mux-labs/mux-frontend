import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecoveryErrorState } from "../RecoveryErrorState";

describe("RecoveryErrorState", () => {
	it("renders with role='alert' and an accessible label", () => {
		render(<RecoveryErrorState />);
		const region = screen.getByRole("alert");
		expect(region).toBeInTheDocument();
		expect(region).toHaveAttribute("aria-label", "Recovery status unavailable");
	});

	it("renders the default error heading", () => {
		render(<RecoveryErrorState />);
		expect(
			screen.getByRole("heading", { name: /recovery status unavailable/i }),
		).toBeInTheDocument();
	});

	it("renders the default description", () => {
		render(<RecoveryErrorState />);
		expect(
			screen.getByText(/unable to load recovery information/i),
		).toBeInTheDocument();
	});

	it("renders a custom description when provided", () => {
		render(<RecoveryErrorState description="Custom error message." />);
		expect(screen.getByText("Custom error message.")).toBeInTheDocument();
	});

	it("does not render a retry button when onRetry is not provided", () => {
		render(<RecoveryErrorState />);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("renders the retry button when onRetry is provided", () => {
		render(<RecoveryErrorState onRetry={vi.fn()} />);
		expect(
			screen.getByRole("button", { name: /try again/i }),
		).toBeInTheDocument();
	});

	it("calls onRetry when the retry button is clicked", async () => {
		const onRetry = vi.fn();
		render(<RecoveryErrorState onRetry={onRetry} />);
		await userEvent.click(screen.getByRole("button", { name: /try again/i }));
		expect(onRetry).toHaveBeenCalledOnce();
	});

	it("applies an extra className to the root element", () => {
		const { container } = render(
			<RecoveryErrorState className="extra-class" />,
		);
		expect(container.firstChild).toHaveClass("extra-class");
	});

	it("warning icon is hidden from assistive technology", () => {
		render(<RecoveryErrorState />);
		const icon = screen.getByRole("alert").querySelector("svg");
		expect(icon).toHaveAttribute("aria-hidden", "true");
	});
});
