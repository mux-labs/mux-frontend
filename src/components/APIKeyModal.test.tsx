import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import APIKeyModal from "./APIKeyModal";

const makeOnCreateKey = (secret = "mux_sk_actual-secret-1234") =>
	vi.fn().mockResolvedValue({
		id: "new-key",
		name: "Production Key",
		key: "mux_sk_a••••1234",
		secret,
		status: "Active" as const,
		createdAt: "2026-07-26T00:00:00.000Z",
	});

describe("APIKeyModal", () => {
	it("does not render when closed", () => {
		const { container } = render(
			<APIKeyModal
				isOpen={false}
				onClose={vi.fn()}
				onCreateKey={makeOnCreateKey()}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	it("validates the key name before creating", async () => {
		const user = userEvent.setup();
		render(
			<APIKeyModal
				isOpen={true}
				onClose={vi.fn()}
				onCreateKey={makeOnCreateKey()}
			/>,
		);

		await user.click(screen.getByTestId("generate-key-btn"));

		expect(screen.getByRole("alert")).toHaveTextContent(
			/key name is required/i,
		);
	});

	it("creates a key and shows the one-time secret", async () => {
		const user = userEvent.setup();
		const onKeyCreated = vi.fn();
		const onCreateKey = makeOnCreateKey();

		render(
			<APIKeyModal
				isOpen={true}
				onClose={vi.fn()}
				onCreateKey={onCreateKey}
				onKeyCreated={onKeyCreated}
			/>,
		);

		await user.type(screen.getByLabelText(/key name/i), "Production Key");
		await user.click(screen.getByTestId("generate-key-btn"));

		await waitFor(() =>
			expect(screen.getByTestId("generated-key")).toHaveTextContent(
				"mux_sk_actual-secret-1234",
			),
		);
		expect(onCreateKey).toHaveBeenCalledWith("Production Key");
		expect(onKeyCreated).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "Production Key",
				key: "mux_sk_a••••1234",
			}),
		);
	});

	it("requires acknowledgement before closing the reveal step", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(
			<APIKeyModal
				isOpen={true}
				onClose={onClose}
				onCreateKey={makeOnCreateKey()}
			/>,
		);

		await user.type(screen.getByLabelText(/key name/i), "Test Key");
		await user.click(screen.getByTestId("generate-key-btn"));

		const doneButton = await screen.findByTestId("done-btn");
		expect(doneButton).toBeDisabled();

		await user.click(screen.getByTestId("acknowledge-checkbox"));
		expect(doneButton).not.toBeDisabled();

		await user.click(doneButton);
		expect(onClose).toHaveBeenCalled();
	});

	it("closes when Escape is pressed on the close button", () => {
		const onClose = vi.fn();
		render(
			<APIKeyModal
				isOpen={true}
				onClose={onClose}
				onCreateKey={makeOnCreateKey()}
			/>,
		);

		fireEvent.click(screen.getByLabelText(/close dialog/i));

		expect(onClose).toHaveBeenCalled();
	});
});
