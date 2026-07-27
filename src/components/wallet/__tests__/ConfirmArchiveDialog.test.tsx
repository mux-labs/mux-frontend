import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmArchiveDialog } from "@/components/wallet/ConfirmArchiveDialog";

describe("ConfirmArchiveDialog", () => {
	it("renders nothing when closed", () => {
		render(
			<ConfirmArchiveDialog
				open={false}
				onConfirm={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);
		expect(screen.queryByTestId("confirm-archive-dialog")).not.toBeInTheDocument();
	});

	it("calls onConfirm when the archive button is clicked", () => {
		const onConfirm = vi.fn();
		render(
			<ConfirmArchiveDialog open onConfirm={onConfirm} onCancel={vi.fn()} />,
		);
		fireEvent.click(screen.getByRole("button", { name: "Archive wallet" }));
		expect(onConfirm).toHaveBeenCalled();
	});

	it("calls onCancel when Escape is pressed", () => {
		const onCancel = vi.fn();
		render(
			<ConfirmArchiveDialog open onConfirm={vi.fn()} onCancel={onCancel} />,
		);
		fireEvent.keyDown(window, { key: "Escape" });
		expect(onCancel).toHaveBeenCalled();
	});

	it("disables both buttons while pending", () => {
		render(
			<ConfirmArchiveDialog
				open
				isPending
				onConfirm={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);
		expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Archiving…" }),
		).toBeDisabled();
	});
});
