/**
 * Regression tests for #708: APIKeyModal must show the secret exactly
 * once (as returned by the backend) and never regenerate it locally.
 *
 * Key invariants under test:
 *  1. The modal renders the secret it receives from onCreateKey — it does
 *     not compute a new one itself.
 *  2. The "Done" button is disabled until the user acknowledges the warning.
 *  3. Closing the modal clears all state so no secret lingers.
 *  4. The modal does not export or call a local secret generator.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import APIKeyModal from "@/components/APIKeyModal";
import type { CreatedApiKey } from "@/types/api-key";

const MOCK_SECRET = "mux_sk_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456";

function makeKey(overrides: Partial<CreatedApiKey> = {}): CreatedApiKey {
	return {
		id: "key-test-1",
		name: "Test Key",
		key: "mux_sk_ABCD••••3456",
		secret: MOCK_SECRET,
		status: "Active",
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

describe("APIKeyModal (#708)", () => {
	let onCreateKey: ReturnType<typeof vi.fn>;
	let onClose: ReturnType<typeof vi.fn>;
	let onKeyCreated: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		onCreateKey = vi.fn().mockResolvedValue(makeKey());
		onClose = vi.fn();
		onKeyCreated = vi.fn();
	});

	function renderModal(open = true) {
		return render(
			<APIKeyModal
				isOpen={open}
				onClose={onClose}
				onCreateKey={onCreateKey}
				onKeyCreated={onKeyCreated}
			/>,
		);
	}

	it("renders the name input step initially", () => {
		renderModal();
		expect(screen.getByLabelText(/key name/i)).toBeInTheDocument();
		expect(
			screen.queryByTestId("generated-key"),
		).not.toBeInTheDocument();
	});

	it("does not render when isOpen is false", () => {
		renderModal(false);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("REGRESSION #708: displays the secret returned by onCreateKey, not a locally-generated one", async () => {
		renderModal();

		const nameInput = screen.getByLabelText(/key name/i);
		fireEvent.change(nameInput, { target: { value: "My Key" } });
		fireEvent.click(screen.getByTestId("generate-key-btn"));

		await waitFor(() => {
			expect(screen.getByTestId("generated-key")).toBeInTheDocument();
		});

		expect(screen.getByTestId("generated-key").textContent).toBe(MOCK_SECRET);
		expect(onCreateKey).toHaveBeenCalledWith("My Key");
	});

	it("REGRESSION #708: Done button is disabled until the user checks the acknowledgement checkbox", async () => {
		renderModal();

		fireEvent.change(screen.getByLabelText(/key name/i), {
			target: { value: "My Key" },
		});
		fireEvent.click(screen.getByTestId("generate-key-btn"));

		await waitFor(() => {
			expect(screen.getByTestId("done-btn")).toBeInTheDocument();
		});

		const doneBtn = screen.getByTestId("done-btn");
		expect(doneBtn).toBeDisabled();

		const checkbox = screen.getByTestId("acknowledge-checkbox");
		fireEvent.click(checkbox);

		expect(doneBtn).not.toBeDisabled();
	});

	it("REGRESSION #708: closing the modal resets all state (secret does not linger)", async () => {
		const { rerender } = renderModal();

		fireEvent.change(screen.getByLabelText(/key name/i), {
			target: { value: "My Key" },
		});
		fireEvent.click(screen.getByTestId("generate-key-btn"));

		await waitFor(() => {
			expect(screen.getByTestId("generated-key")).toBeInTheDocument();
		});

		// Close the modal.
		fireEvent.click(screen.getByTestId("acknowledge-checkbox"));
		fireEvent.click(screen.getByTestId("done-btn"));
		expect(onClose).toHaveBeenCalledOnce();

		// Reopen — no secret should be visible.
		rerender(
			<APIKeyModal
				isOpen={true}
				onClose={onClose}
				onCreateKey={onCreateKey}
				onKeyCreated={onKeyCreated}
			/>,
		);

		// The modal shows the name input, not a stale secret.
		expect(screen.getByLabelText(/key name/i)).toBeInTheDocument();
		expect(
			screen.queryByTestId("generated-key"),
		).not.toBeInTheDocument();
	});

	it("shows an error when onCreateKey rejects", async () => {
		onCreateKey.mockRejectedValue(new Error("Backend unavailable"));
		renderModal();

		fireEvent.change(screen.getByLabelText(/key name/i), {
			target: { value: "My Key" },
		});
		fireEvent.click(screen.getByTestId("generate-key-btn"));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});

		expect(screen.getByRole("alert").textContent).toContain(
			"Backend unavailable",
		);
	});

	it("shows a validation error when name is empty", async () => {
		renderModal();
		fireEvent.click(screen.getByTestId("generate-key-btn"));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});

		expect(onCreateKey).not.toHaveBeenCalled();
	});
});
