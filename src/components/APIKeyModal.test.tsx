import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import APIKeyModal from "./APIKeyModal";

describe("APIKeyModal", () => {
	it("does not render when closed", () => {
		const { container } = render(
			<APIKeyModal isOpen={false} onClose={vi.fn()} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders when open", () => {
		render(<APIKeyModal isOpen={true} onClose={vi.fn()} />);
		expect(screen.getByText("Create API Key")).toBeInTheDocument();
	});

	it("shows warning message initially", () => {
		render(<APIKeyModal isOpen={true} onClose={vi.fn()} />);
		expect(screen.getByText(/save your api key/i)).toBeInTheDocument();
	});

	it("has key name input field", () => {
		render(<APIKeyModal isOpen={true} onClose={vi.fn()} />);
		expect(screen.getByLabelText(/key name/i)).toBeInTheDocument();
	});

	it("calls onKeyCreated when key is generated", async () => {
		const onKeyCreated = vi.fn();
		render(
			<APIKeyModal
				isOpen={true}
				onClose={vi.fn()}
				onKeyCreated={onKeyCreated}
			/>,
		);

		const input = screen.getByLabelText(/key name/i);
		fireEvent.change(input, { target: { value: "Test Key" } });

		const generateButton = screen.getByText(/generate key/i);
		fireEvent.click(generateButton);

		await waitFor(() => {
			expect(onKeyCreated).toHaveBeenCalledWith({
				name: "Test Key",
				value: expect.any(String),
				key: expect.any(String),
			});
		});
	});

	it("shows error when name is empty", async () => {
		render(<APIKeyModal isOpen={true} onClose={vi.fn()} />);

		const generateButton = screen.getByText(/generate key/i);
		fireEvent.click(generateButton);

		await waitFor(() => {
			expect(screen.getByText(/key name is required/i)).toBeInTheDocument();
		});
	});

	it("disables generate button while submitting", async () => {
		render(<APIKeyModal isOpen={true} onClose={vi.fn()} />);

		const input = screen.getByLabelText(/key name/i);
		fireEvent.change(input, { target: { value: "Test Key" } });

		const generateButton = screen.getByText(/generate key/i);
		fireEvent.click(generateButton);

		expect(generateButton).toBeDisabled();
	});

	it("calls onClose when close button is clicked", () => {
		const onClose = vi.fn();
		render(<APIKeyModal isOpen={true} onClose={onClose} />);

		const closeButton = screen.getByText("Close");
		fireEvent.click(closeButton);

		expect(onClose).toHaveBeenCalled();
	});

	it("closes when Escape is pressed", () => {
		const onClose = vi.fn();
		render(<APIKeyModal isOpen={true} onClose={onClose} />);

		fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

		expect(onClose).toHaveBeenCalled();
	});
});
