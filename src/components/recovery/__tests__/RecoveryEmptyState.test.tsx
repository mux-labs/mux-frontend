import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecoveryEmptyState } from "../RecoveryEmptyState";

describe("RecoveryEmptyState", () => {
	it("renders with role='status' and an accessible label", () => {
		render(<RecoveryEmptyState />);
		const region = screen.getByRole("status");
		expect(region).toBeInTheDocument();
		expect(region).toHaveAttribute("aria-label", "No recovery history");
	});

	it("renders the empty state heading", () => {
		render(<RecoveryEmptyState />);
		expect(
			screen.getByRole("heading", { name: /no recovery history/i }),
		).toBeInTheDocument();
	});

	it("renders the descriptive copy", () => {
		render(<RecoveryEmptyState />);
		expect(
			screen.getByText(/your wallet has not initiated any recovery requests/i),
		).toBeInTheDocument();
	});

	it("does not render an action button when onInitiate is not provided", () => {
		render(<RecoveryEmptyState />);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("renders the action button when onInitiate is provided", () => {
		render(<RecoveryEmptyState onInitiate={vi.fn()} />);
		expect(
			screen.getByRole("button", { name: /initiate recovery/i }),
		).toBeInTheDocument();
	});

	it("calls onInitiate when the action button is clicked", async () => {
		const onInitiate = vi.fn();
		render(<RecoveryEmptyState onInitiate={onInitiate} />);
		await userEvent.click(
			screen.getByRole("button", { name: /initiate recovery/i }),
		);
		expect(onInitiate).toHaveBeenCalledOnce();
	});

	it("applies an extra className to the root element", () => {
		const { container } = render(
			<RecoveryEmptyState className="extra-class" />,
		);
		expect(container.firstChild).toHaveClass("extra-class");
	});

	it("shield icon is hidden from assistive technology", () => {
		render(<RecoveryEmptyState />);
		const icon = screen.getByRole("status").querySelector("svg");
		expect(icon).toHaveAttribute("aria-hidden", "true");
	});
});
