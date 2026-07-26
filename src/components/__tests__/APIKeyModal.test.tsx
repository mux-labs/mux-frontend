import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import APIKeyModal from "../APIKeyModal";

// ---------------------------------------------------------------------------
// Feature 2: One-time key reveal dialog
// ---------------------------------------------------------------------------
describe("APIKeyModal — one-time key reveal", () => {
	it("does not render when isOpen is false", () => {
		render(<APIKeyModal isOpen={false} onClose={vi.fn()} />);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("renders the form step when opened", () => {
		render(<APIKeyModal isOpen onClose={vi.fn()} />);
		expect(
			screen.getByRole("dialog", { name: /create api key/i }),
		).toBeInTheDocument();
		expect(screen.getByLabelText(/key name/i)).toBeInTheDocument();
	});

	it("shows validation error when name is empty", async () => {
		const user = userEvent.setup();
		render(<APIKeyModal isOpen onClose={vi.fn()} />);
		await user.click(screen.getByTestId("generate-key-btn"));
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Key name is required.",
		);
	});

	it("transitions to reveal step after generating a key", async () => {
		const user = userEvent.setup();
		render(<APIKeyModal isOpen onClose={vi.fn()} />);
		await user.type(screen.getByLabelText(/key name/i), "My Key");
		await user.click(screen.getByTestId("generate-key-btn"));
		// Reveal step heading
		expect(
			screen.getByRole("dialog", { name: /save your api key/i }),
		).toBeInTheDocument();
		// One-time warning
		expect(
			screen.getByText(/this key will only be shown once/i),
		).toBeInTheDocument();
		// Generated key is displayed
		const keyEl = screen.getByTestId("generated-key");
		expect(keyEl.textContent).toMatch(/^mux_live_/);
	});

	it("calls onKeyCreated with name and value", async () => {
		const user = userEvent.setup();
		const onKeyCreated = vi.fn();
		render(
			<APIKeyModal isOpen onClose={vi.fn()} onKeyCreated={onKeyCreated} />,
		);
		await user.type(screen.getByLabelText(/key name/i), "Prod Key");
		await user.click(screen.getByTestId("generate-key-btn"));
		expect(onKeyCreated).toHaveBeenCalledOnce();
		expect(onKeyCreated).toHaveBeenCalledWith(
			expect.objectContaining({ name: "Prod Key" }),
		);
	});

	it("copies the key to clipboard", async () => {
		const user = userEvent.setup();
		render(<APIKeyModal isOpen onClose={vi.fn()} />);
		await user.type(screen.getByLabelText(/key name/i), "My Key");
		await user.click(screen.getByTestId("generate-key-btn"));
		await user.click(screen.getByTestId("copy-generated-key"));
		expect(navigator.clipboard.writeText).toHaveBeenCalled();
		await waitFor(() =>
			expect(screen.getByRole("status")).toHaveTextContent(
				"API key copied to clipboard",
			),
		);
	});

	it("Done button is disabled until acknowledged", async () => {
		const user = userEvent.setup();
		render(<APIKeyModal isOpen onClose={vi.fn()} />);
		await user.type(screen.getByLabelText(/key name/i), "My Key");
		await user.click(screen.getByTestId("generate-key-btn"));
		const doneBtn = screen.getByTestId("done-btn");
		expect(doneBtn).toBeDisabled();
		await user.click(screen.getByTestId("acknowledge-checkbox"));
		expect(doneBtn).not.toBeDisabled();
	});

	it("closes and resets after Done is clicked", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(<APIKeyModal isOpen onClose={onClose} />);
		await user.type(screen.getByLabelText(/key name/i), "My Key");
		await user.click(screen.getByTestId("generate-key-btn"));
		await user.click(screen.getByTestId("acknowledge-checkbox"));
		await user.click(screen.getByTestId("done-btn"));
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("resets to form step when closed via X button", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(<APIKeyModal isOpen onClose={onClose} />);
		await user.click(screen.getByRole("button", { name: /close dialog/i }));
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("closes with Escape", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(<APIKeyModal isOpen onClose={onClose} />);
		await user.keyboard("{Escape}");
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("keeps Tab focus inside the dialog", async () => {
		const user = userEvent.setup();
		render(<APIKeyModal isOpen onClose={vi.fn()} />);

		const closeButton = screen.getByRole("button", { name: /close dialog/i });
		const generateButton = screen.getByTestId("generate-key-btn");

		closeButton.focus();
		await user.keyboard("{Shift>}{Tab}{/Shift}");
		expect(generateButton).toHaveFocus();

		await user.tab();
		expect(closeButton).toHaveFocus();
	});
});
