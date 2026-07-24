import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SendDraftScreen } from "../SendDraftScreen";

const wallet = { id: "1", name: "Main Wallet" } as never;

describe("SendDraftScreen", () => {
	it("renders destination and amount fields", () => {
		render(<SendDraftScreen wallet={wallet} />);
		expect(screen.getByTestId("send-draft-screen")).toBeInTheDocument();
		expect(screen.getByLabelText("Destination")).toBeInTheDocument();
		expect(screen.getByLabelText("Amount")).toBeInTheDocument();
	});

	it("calls onContinue with draft values", () => {
		const onContinue = vi.fn();
		render(<SendDraftScreen wallet={wallet} onContinue={onContinue} />);
		fireEvent.change(screen.getByLabelText("Destination"), {
			target: { value: "GABC" },
		});
		fireEvent.change(screen.getByLabelText("Amount"), {
			target: { value: "10" },
		});
		fireEvent.click(screen.getByText("Continue"));
		expect(onContinue).toHaveBeenCalledWith({ destination: "GABC", amount: "10" });
	});
});
