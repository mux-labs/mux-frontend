import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Toast } from "./toast";

describe("Toast", () => {
	describe("visibility", () => {
		it("renders nothing when open is false", () => {
			render(<Toast open={false} message="test message" />);
			expect(screen.queryByRole("status")).not.toBeInTheDocument();
		});

		it("renders when open is true", () => {
			render(<Toast open={true} message="test message" />);
			expect(screen.getByRole("status")).toBeInTheDocument();
		});
	});

	describe("content", () => {
		it("displays the message", () => {
			render(<Toast open={true} message="Wallet added" />);
			expect(screen.getByText("Wallet added")).toBeInTheDocument();
		});

		it("uses 'Success' as default title for success variant", () => {
			render(<Toast open={true} message="Done" />);
			expect(screen.getByText("Success")).toBeInTheDocument();
		});

		it("uses 'Error' as default title for error variant", () => {
			render(
				<Toast open={true} message="Something went wrong" variant="error" />,
			);
			expect(screen.getByText("Error")).toBeInTheDocument();
		});

		it("uses 'Info' as default title for info variant", () => {
			render(<Toast open={true} message="FYI" variant="info" />);
			expect(screen.getByText("Info")).toBeInTheDocument();
		});

		it("renders a custom title when provided", () => {
			render(<Toast open={true} message="oops" title="Custom Title" />);
			expect(screen.getByText("Custom Title")).toBeInTheDocument();
		});

		it("custom title overrides the variant default", () => {
			render(
				<Toast
					open={true}
					message="msg"
					variant="error"
					title="My Error Title"
				/>,
			);
			expect(screen.getByText("My Error Title")).toBeInTheDocument();
			expect(screen.queryByText("Error")).not.toBeInTheDocument();
		});
	});

	describe("accessibility", () => {
		it("has role=status and aria-live=polite", () => {
			render(<Toast open={true} message="hello" />);
			const status = screen.getByRole("status");
			expect(status).toHaveAttribute("aria-live", "polite");
		});
	});

	describe("dismiss button", () => {
		it("renders dismiss button when onClose is provided", () => {
			render(<Toast open={true} message="hi" onClose={vi.fn()} />);
			expect(
				screen.getByRole("button", { name: /dismiss notification/i }),
			).toBeInTheDocument();
		});

		it("does not render dismiss button when onClose is omitted", () => {
			render(<Toast open={true} message="hi" />);
			expect(
				screen.queryByRole("button", { name: /dismiss notification/i }),
			).not.toBeInTheDocument();
		});

		it("calls onClose when dismiss button is clicked", async () => {
			const user = userEvent.setup();
			const onClose = vi.fn();
			render(<Toast open={true} message="hi" onClose={onClose} />);
			await user.click(
				screen.getByRole("button", { name: /dismiss notification/i }),
			);
			expect(onClose).toHaveBeenCalledOnce();
		});
	});

	describe("variants", () => {
		it("defaults to success variant when variant is omitted", () => {
			render(<Toast open={true} message="done" />);
			expect(screen.getByText("Success")).toBeInTheDocument();
		});

		it("renders success variant correctly", () => {
			render(<Toast open={true} message="done" variant="success" />);
			expect(screen.getByText("Success")).toBeInTheDocument();
			expect(screen.getByText("done")).toBeInTheDocument();
		});

		it("renders error variant correctly", () => {
			render(<Toast open={true} message="failed" variant="error" />);
			expect(screen.getByText("Error")).toBeInTheDocument();
			expect(screen.getByText("failed")).toBeInTheDocument();
		});

		it("renders info variant correctly", () => {
			render(<Toast open={true} message="note" variant="info" />);
			expect(screen.getByText("Info")).toBeInTheDocument();
			expect(screen.getByText("note")).toBeInTheDocument();
		});
	});
});
