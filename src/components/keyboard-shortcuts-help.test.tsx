import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { KeyboardShortcutsHelp } from "./keyboard-shortcuts-help";

afterEach(cleanup);

describe("KeyboardShortcutsHelp", () => {
	it("does not render the dialog initially", () => {
		render(<KeyboardShortcutsHelp />);

		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("opens the dialog when ? is pressed", () => {
		render(<KeyboardShortcutsHelp />);

		fireEvent.keyDown(window, { key: "?" });

		expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeTruthy();
	});

	it("closes the dialog when Escape is pressed", () => {
		render(<KeyboardShortcutsHelp />);

		fireEvent.keyDown(window, { key: "?" });
		expect(screen.getByRole("dialog")).toBeTruthy();

		fireEvent.keyDown(window, { key: "Escape" });

		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("does not open the dialog when ? is pressed inside an input or textarea", () => {
		render(
			<>
				<input aria-label="Search" />
				<textarea aria-label="Message" />
				<KeyboardShortcutsHelp />
			</>,
		);

		fireEvent.keyDown(screen.getByRole("textbox", { name: "Search" }), {
			key: "?",
		});

		expect(screen.queryByRole("dialog")).toBeNull();

		fireEvent.keyDown(screen.getByRole("textbox", { name: "Message" }), {
			key: "?",
		});

		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("closes the dialog when the Close button is clicked", () => {
		render(<KeyboardShortcutsHelp />);

		fireEvent.keyDown(window, { key: "?" });

		fireEvent.click(screen.getByRole("button", { name: "Close" }));

		expect(screen.queryByRole("dialog")).toBeNull();
	});
});
