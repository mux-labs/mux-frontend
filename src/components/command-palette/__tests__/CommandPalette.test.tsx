/**
 * Tests for CommandPalette (#674)
 *
 * Covers mounting behavior: hidden by default, opens on Ctrl/Cmd+K, filters
 * commands by search, navigates and closes on selection, closes on Escape.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommandPalette } from "../CommandPalette";

const push = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push }),
}));

afterEach(() => {
	push.mockClear();
});

describe("CommandPalette", () => {
	it("is not rendered until opened", () => {
		render(<CommandPalette />);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("opens on Ctrl+K", () => {
		render(<CommandPalette />);
		fireEvent.keyDown(window, { key: "k", ctrlKey: true });
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	it("opens on Cmd+K (metaKey)", () => {
		render(<CommandPalette />);
		fireEvent.keyDown(window, { key: "k", metaKey: true });
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	it("filters commands as the user types", () => {
		render(<CommandPalette />);
		fireEvent.keyDown(window, { key: "k", ctrlKey: true });

		const input = screen.getByLabelText(/search commands/i);
		fireEvent.change(input, { target: { value: "wallet" } });

		expect(screen.getByText("Go to Wallets")).toBeInTheDocument();
		expect(screen.queryByText("Go to Settings")).not.toBeInTheDocument();
	});

	it("navigates and closes the palette when a command is selected", () => {
		render(<CommandPalette />);
		fireEvent.keyDown(window, { key: "k", ctrlKey: true });

		fireEvent.click(screen.getByText("Go to Wallets"));

		expect(push).toHaveBeenCalledWith("/dashboard/wallets");
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("closes on Escape", () => {
		render(<CommandPalette />);
		fireEvent.keyDown(window, { key: "k", ctrlKey: true });
		expect(screen.getByRole("dialog")).toBeInTheDocument();

		fireEvent.keyDown(window, { key: "Escape" });
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});
});
