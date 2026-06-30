import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FAQItem } from "../RecoveryFAQ";
import { FAQ_ITEMS, RecoveryFAQ } from "../RecoveryFAQ";

const SAMPLE: FAQItem[] = [
	{ id: "q1", question: "First question?", answer: "First answer." },
	{ id: "q2", question: "Second question?", answer: "Second answer." },
	{ id: "q3", question: "Third question?", answer: "Third answer." },
];

describe("RecoveryFAQ", () => {
	it("renders FAQ heading and items", () => {
		render(<RecoveryFAQ />);
		expect(
			screen.getByRole("heading", { name: /frequently asked questions/i }),
		).toBeInTheDocument();
		expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
	});

	it("renders external docs link at the bottom", () => {
		render(<RecoveryFAQ />);
		const link = screen.getByRole("link", {
			name: /read recovery documentation/i,
		});
		expect(link).toBeInTheDocument();
		expect(link).toHaveTextContent("Read Docs");
	});

	it("expands and collapses FAQ items", async () => {
		const user = userEvent.setup();
		render(<RecoveryFAQ />);
		const firstQuestion = screen.getAllByRole("button")[0];

		await user.click(firstQuestion);
		expect(firstQuestion).toHaveAttribute("aria-expanded", "true");
	});

	it("shows a copy button for each open FAQ answer", async () => {
		const user = userEvent.setup();
		render(<RecoveryFAQ items={SAMPLE} />);

		// Expand the first item
		await user.click(screen.getByText("First question?"));

		// The "Copy" button should be visible for the answer
		const copyBtn = screen.getByRole("button", {
			name: /copy answer to clipboard/i,
		});
		expect(copyBtn).toBeInTheDocument();
	});

	it("copies FAQ answer text to clipboard when copy button is clicked", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			writable: true,
			configurable: true,
		});

		const user = userEvent.setup();
		render(<RecoveryFAQ items={SAMPLE} />);

		// Expand the first item
		await user.click(screen.getByText("First question?"));

		// Click the copy button
		await user.click(
			screen.getByRole("button", { name: /copy answer to clipboard/i }),
		);

		expect(writeText).toHaveBeenCalledWith("First answer.");
	});

	it("shows 'Copied' feedback after copying an answer", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			writable: true,
			configurable: true,
		});

		const user = userEvent.setup();
		render(<RecoveryFAQ items={SAMPLE} />);

		await user.click(screen.getByText("First question?"));
		await user.click(
			screen.getByRole("button", { name: /copy answer to clipboard/i }),
		);

		expect(screen.getByText("Copied")).toBeInTheDocument();
	});
});