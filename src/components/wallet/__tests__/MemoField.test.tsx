import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoField } from "../MemoField";

describe("MemoField", () => {
	it("shows the counter updating as text is typed", () => {
		render(<MemoField />);
		const input = screen.getByLabelText("Memo (optional)");
		expect(screen.getByTestId("memo-counter")).toHaveTextContent("0/28");
		fireEvent.change(input, { target: { value: "hello" } });
		expect(screen.getByTestId("memo-counter")).toHaveTextContent("5/28");
	});

	it("does not exceed the max length", () => {
		render(<MemoField maxLength={5} />);
		const input = screen.getByLabelText("Memo (optional)");
		fireEvent.change(input, { target: { value: "abcdef" } });
		expect(screen.getByTestId("memo-counter")).toHaveTextContent("0/5");
	});
});
