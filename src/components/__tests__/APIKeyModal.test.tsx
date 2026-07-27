import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import APIKeyModal from "../APIKeyModal";

describe("APIKeyModal — one-time key reveal", () => {
	it("renders the form step when opened", () => {
		render(<APIKeyModal isOpen onClose={vi.fn()} />);
		expect(
			screen.getByRole("dialog", { name: /create api key/i }),
		).toBeInTheDocument();
		expect(screen.getByLabelText(/key name/i)).toBeInTheDocument();
	});

	it("transitions to the one-time reveal step after creating a key", async () => {
		const user = userEvent.setup();
		render(<APIKeyModal isOpen onClose={vi.fn()} />);

		await user.type(screen.getByLabelText(/key name/i), "My Key");
		await user.click(screen.getByTestId("generate-key-btn"));

		await waitFor(() =>
			expect(
				screen.getByRole("dialog", { name: /save your api key/i }),
			).toBeInTheDocument(),
		);
		expect(screen.getByText(/will not be shown again/i)).toBeInTheDocument();
		expect(screen.getByTestId("generated-key").textContent).toMatch(
			/^mux_live_/,
		);
	});

	it("copies the generated key with clipboard feedback", async () => {
		const user = userEvent.setup();
		render(<APIKeyModal isOpen onClose={vi.fn()} />);

		await user.type(screen.getByLabelText(/key name/i), "My Key");
		await user.click(screen.getByTestId("generate-key-btn"));
		await user.click(await screen.findByTestId("copy-generated-key"));

		expect(navigator.clipboard.writeText).toHaveBeenCalled();
		await waitFor(() =>
			expect(screen.getByRole("status")).toHaveTextContent(
				"API key copied to clipboard",
			),
		);
	});

	it("closes from the header close button", async () => {
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
