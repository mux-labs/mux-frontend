import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Toast } from "../toast";

describe("Toast", () => {
	it("renders nothing when open is false", () => {
		const { container } = render(<Toast open={false} message="Test message" />);
		expect(container.firstChild).toBeNull();
	});

	it("renders message when open is true", () => {
		render(<Toast open message="Recovery submitted" />);
		expect(screen.getByText("Recovery submitted")).toBeInTheDocument();
	});

	it("defaults to success variant with title 'Success'", () => {
		render(<Toast open message="Done" />);
		expect(screen.getByText("Success")).toBeInTheDocument();
	});

	it("renders error variant with title 'Error'", () => {
		render(<Toast open message="Something failed" variant="error" />);
		expect(screen.getByText("Error")).toBeInTheDocument();
		expect(screen.getByText("Something failed")).toBeInTheDocument();
	});

	it("renders info variant with title 'Info'", () => {
		render(<Toast open message="Take note" variant="info" />);
		expect(screen.getByText("Info")).toBeInTheDocument();
	});

	it("has role=status and aria-live=polite", () => {
		render(<Toast open message="Done" />);
		const status = screen.getByRole("status");
		expect(status).toHaveAttribute("aria-live", "polite");
	});
});
