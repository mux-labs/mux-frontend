import { fireEvent, render, screen } from "@testing-library/react";
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

	it("renders custom items", () => {
		render(<RecoveryFAQ items={SAMPLE} />);
		expect(screen.getByText("First question?")).toBeInTheDocument();
		expect(screen.getByText("Second question?")).toBeInTheDocument();
		expect(screen.getByText("Third question?")).toBeInTheDocument();
	});

	it("handles empty items array", () => {
		render(<RecoveryFAQ items={[]} />);
		expect(
			screen.getByText("No FAQ items available."),
		).toBeInTheDocument();
	});

	describe("Keyboard navigation", () => {
		it("should navigate down with ArrowDown", async () => {
			const user = userEvent.setup();
			render(<RecoveryFAQ items={SAMPLE} />);

			const buttons = screen.getAllByRole("button");
			buttons[0].focus();
			await user.keyboard("{ArrowDown}");
			expect(buttons[1]).toHaveFocus();
		});

		it("should navigate up with ArrowUp", async () => {
			const user = userEvent.setup();
			render(<RecoveryFAQ items={SAMPLE} />);

			const buttons = screen.getAllByRole("button");
			buttons[1].focus();
			await user.keyboard("{ArrowUp}");
			expect(buttons[0]).toHaveFocus();
		});

		it("should navigate to first item with Home", async () => {
			const user = userEvent.setup();
			render(<RecoveryFAQ items={SAMPLE} />);

			const buttons = screen.getAllByRole("button");
			const lastIndex = buttons.length - 1;
			buttons[lastIndex].focus();
			await user.keyboard("{Home}");
			expect(buttons[0]).toHaveFocus();
		});

		it("should navigate to last item with End", async () => {
			const user = userEvent.setup();
			render(<RecoveryFAQ items={SAMPLE} />);

			const buttons = screen.getAllByRole("button");
			const lastIndex = buttons.length - 1;
			buttons[0].focus();
			await user.keyboard("{End}");
			expect(buttons[lastIndex]).toHaveFocus();
		});

		it("should not navigate past the first item with ArrowUp", async () => {
			const user = userEvent.setup();
			render(<RecoveryFAQ items={SAMPLE} />);

			const buttons = screen.getAllByRole("button");
			buttons[0].focus();
			await user.keyboard("{ArrowUp}");
			expect(buttons[0]).toHaveFocus();
		});

		it("should not navigate past the last item with ArrowDown", async () => {
			const user = userEvent.setup();
			render(<RecoveryFAQ items={SAMPLE} />);

			const buttons = screen.getAllByRole("button");
			const lastIndex = buttons.length - 1;
			buttons[lastIndex].focus();
			await user.keyboard("{ArrowDown}");
			expect(buttons[lastIndex]).toHaveFocus();
		});

		it("should handle single item keyboard navigation", async () => {
			const user = userEvent.setup();
			render(<RecoveryFAQ items={[SAMPLE[0]]} />);

			const buttons = screen.getAllByRole("button");
			buttons[0].focus();
			await user.keyboard("{ArrowDown}");
			expect(buttons[0]).toHaveFocus();
			await user.keyboard("{ArrowUp}");
			expect(buttons[0]).toHaveFocus();
		});

		it("should expand item on Enter", async () => {
			const user = userEvent.setup();
			render(<RecoveryFAQ items={SAMPLE} />);

			const buttons = screen.getAllByRole("button");
			buttons[0].focus();
			await user.keyboard("{Enter}");
			expect(buttons[0]).toHaveAttribute("aria-expanded", "true");
		});

		it("should collapse item on Enter when already open", async () => {
			const user = userEvent.setup();
			render(<RecoveryFAQ items={SAMPLE} />);

			const buttons = screen.getAllByRole("button");
			buttons[0].focus();
			await user.keyboard("{Enter}");
			expect(buttons[0]).toHaveAttribute("aria-expanded", "true");
			await user.keyboard("{Enter}");
			expect(buttons[0]).toHaveAttribute("aria-expanded", "false");
		});
	});
});
