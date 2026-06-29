import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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

	it("expands and collapses FAQ items", () => {
		render(<RecoveryFAQ />);
		const firstQuestion = screen.getAllByRole("button")[0];

		fireEvent.click(firstQuestion);
		expect(firstQuestion).toHaveAttribute("aria-expanded", "true");
	});
});
