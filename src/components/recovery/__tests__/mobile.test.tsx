/**
 * Mobile layout tests for the Recovery UI (issue #322 — Recovery UI: Add mobile layout polish)
 *
 * Verifies that components have the correct responsive Tailwind classes so the
 * layout stacks vertically on small viewports and goes side-by-side on larger
 * ones. Tests check class names rather than pixel sizes because jsdom does not
 * implement CSS media queries.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { UseRecoveryReturn } from "@/hooks/useRecovery";
import { InitiateRecoveryCTA } from "../InitiateRecoveryCTA";
import { RecoveryFAQ } from "../RecoveryFAQ";

function makeRecovery(
	overrides: Partial<UseRecoveryReturn> = {},
): UseRecoveryReturn {
	return {
		state: "idle",
		errorMessage: null,
		initiateRecovery: vi.fn(),
		confirmRecovery: vi.fn(),
		cancelRecovery: vi.fn(),
		resetRecovery: vi.fn(),
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// InitiateRecoveryCTA — confirming state button group
// ---------------------------------------------------------------------------

describe("InitiateRecoveryCTA — mobile layout (confirming state)", () => {
	it("button group stacks vertically by default (flex-col) and rows on sm+ (sm:flex-row)", () => {
		const { container } = render(
			<InitiateRecoveryCTA recovery={makeRecovery({ state: "confirming" })} />,
		);
		const buttonGroup = container.querySelector(".flex-col");
		expect(buttonGroup).toBeInTheDocument();
		// Also has sm:flex-row for larger viewports
		expect(buttonGroup?.className).toMatch(/sm:flex-row/);
	});

	it("renders both action buttons in the confirming state", () => {
		render(
			<InitiateRecoveryCTA recovery={makeRecovery({ state: "confirming" })} />,
		);
		expect(
			screen.getByRole("button", { name: /yes, initiate recovery/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// RecoveryFAQ — footer row
// ---------------------------------------------------------------------------

describe("RecoveryFAQ — mobile layout (footer row)", () => {
	it("footer row stacks vertically by default and rows on sm+", () => {
		const { container } = render(<RecoveryFAQ />);
		// The footer inside RecoveryFAQ uses flex-col sm:flex-row
		const footerRow = container.querySelector(".flex-col.sm\\:flex-row");
		expect(footerRow).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// RecoveryFAQ — empty items prop
// ---------------------------------------------------------------------------

describe("RecoveryFAQ — empty state", () => {
	it("renders a fallback message when items array is empty", () => {
		render(<RecoveryFAQ items={[]} />);
		expect(screen.getByText(/no faq items available/i)).toBeInTheDocument();
	});
});
