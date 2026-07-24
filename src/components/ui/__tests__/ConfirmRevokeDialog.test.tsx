import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmRevokeDialog } from "../ConfirmRevokeDialog";

describe("ConfirmRevokeDialog", () => {
	it("renders nothing when closed", () => {
		render(
			<ConfirmRevokeDialog
				open={false}
				onConfirm={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);
		expect(screen.queryByTestId("confirm-revoke-dialog")).toBeNull();
	});

	it("renders an alertdialog with key label when open", () => {
		render(
			<ConfirmRevokeDialog
				open
				keyLabel="prod-key-1"
				onConfirm={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);
		const dialog = screen.getByTestId("confirm-revoke-dialog");
		expect(dialog).toBeInTheDocument();
		expect(dialog.textContent).toContain("prod-key-1");
	});

	it("calls onConfirm when the revoke button is clicked", () => {
		const onConfirm = vi.fn();
		render(
			<ConfirmRevokeDialog open onConfirm={onConfirm} onCancel={vi.fn()} />,
		);
		fireEvent.click(screen.getByRole("button", { name: /revoke key/i }));
		expect(onConfirm).toHaveBeenCalledTimes(1);
	});

	it("calls onCancel when Escape is pressed", () => {
		const onCancel = vi.fn();
		render(
			<ConfirmRevokeDialog open onConfirm={vi.fn()} onCancel={onCancel} />,
		);
		fireEvent.keyDown(window, { key: "Escape" });
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it("disables both buttons while pending", () => {
		render(
			<ConfirmRevokeDialog
				open
				isPending
				onConfirm={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);
		expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
		expect(
			screen.getByRole("button", { name: /revoking/i }),
		).toBeDisabled();
	});
});
