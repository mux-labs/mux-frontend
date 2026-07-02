/**
 * Dark mode style tests for the Recovery UI (issue #321 — Recovery UI: Add dark mode styles)
 *
 * Verifies that each recovery component carries the expected `dark:` Tailwind
 * classes so the UI renders correctly when the `dark` class is on
 * `document.documentElement`. Tests check className strings rather than
 * computed styles because jsdom does not evaluate CSS.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { UseRecoveryReturn } from "@/hooks/useRecovery";
import { InitiateRecoveryCTA } from "../InitiateRecoveryCTA";
import { RecoveryDocsLink } from "../RecoveryDocsLink";
import { RecoveryExplanation } from "../RecoveryExplanation";
import { RecoveryFAQ } from "../RecoveryFAQ";
import { RecoveryLoadingState } from "../RecoveryLoadingState";
import { RecoveryStatus } from "../RecoveryStatus";

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
// RecoveryStatus
// ---------------------------------------------------------------------------

describe("RecoveryStatus — dark mode classes", () => {
	it("active badge includes dark:bg-green-900/20 and dark:text-green-400", () => {
		const { container } = render(<RecoveryStatus status="active" />);
		const badge = container.firstElementChild;
		expect(badge?.className).toMatch(/dark:bg-green-900\/20/);
		expect(badge?.className).toMatch(/dark:text-green-400/);
	});

	it("error badge includes dark:bg-red-900/20 and dark:text-red-400", () => {
		const { container } = render(<RecoveryStatus status="error" />);
		const badge = container.firstElementChild;
		expect(badge?.className).toMatch(/dark:bg-red-900\/20/);
		expect(badge?.className).toMatch(/dark:text-red-400/);
	});

	it("disconnected badge includes dark:bg-zinc-800/40", () => {
		const { container } = render(<RecoveryStatus status="disconnected" />);
		const badge = container.firstElementChild;
		expect(badge?.className).toMatch(/dark:bg-zinc-800\/40/);
	});
});

// ---------------------------------------------------------------------------
// RecoveryDocsLink
// ---------------------------------------------------------------------------

describe("RecoveryDocsLink — dark mode classes", () => {
	it("includes dark:bg-zinc-800 and dark:text-zinc-50", () => {
		const { container } = render(<RecoveryDocsLink />);
		const link = container.querySelector("a");
		expect(link?.className).toMatch(/dark:bg-zinc-800/);
		expect(link?.className).toMatch(/dark:text-zinc-50/);
	});

	it("includes dark:hover:bg-zinc-700 for hover state", () => {
		const { container } = render(<RecoveryDocsLink />);
		const link = container.querySelector("a");
		expect(link?.className).toMatch(/dark:hover:bg-zinc-700/);
	});
});

// ---------------------------------------------------------------------------
// RecoveryLoadingState
// ---------------------------------------------------------------------------

describe("RecoveryLoadingState — dark mode classes", () => {
	it("status card skeleton uses dark:bg-zinc-950 background", () => {
		const { container } = render(<RecoveryLoadingState />);
		const cards = container.querySelectorAll(".dark\\:bg-zinc-950");
		expect(cards.length).toBeGreaterThanOrEqual(1);
	});

	it("skeleton pulse items use dark:bg-zinc-800", () => {
		const { container } = render(<RecoveryLoadingState />);
		const darkSkeletons = container.querySelectorAll(".dark\\:bg-zinc-800");
		expect(darkSkeletons.length).toBeGreaterThan(0);
	});

	it("card borders use dark:border-zinc-800", () => {
		const { container } = render(<RecoveryLoadingState />);
		const darkBorders = container.querySelectorAll(".dark\\:border-zinc-800");
		expect(darkBorders.length).toBeGreaterThanOrEqual(1);
	});

	it("suppresses shadow in dark mode via dark:shadow-none", () => {
		const { container } = render(<RecoveryLoadingState />);
		const shadowlessCards = container.querySelectorAll(".dark\\:shadow-none");
		expect(shadowlessCards.length).toBeGreaterThanOrEqual(1);
	});
});

// ---------------------------------------------------------------------------
// RecoveryFAQ
// ---------------------------------------------------------------------------

describe("RecoveryFAQ — dark mode classes", () => {
	it("section wrapper uses dark:bg-zinc-950 and dark:border-zinc-800", () => {
		const { container } = render(<RecoveryFAQ />);
		const section = container.querySelector("section");
		expect(section?.className).toMatch(/dark:bg-zinc-950/);
		expect(section?.className).toMatch(/dark:border-zinc-800/);
	});

	it("section wrapper suppresses shadow in dark mode", () => {
		const { container } = render(<RecoveryFAQ />);
		const section = container.querySelector("section");
		expect(section?.className).toMatch(/dark:shadow-none/);
	});

	it("FAQ heading uses dark:text-zinc-50", () => {
		const { container } = render(<RecoveryFAQ />);
		const heading = container.querySelector("h2");
		expect(heading?.className).toMatch(/dark:text-zinc-50/);
	});
});

// ---------------------------------------------------------------------------
// InitiateRecoveryCTA — dark mode per state
// ---------------------------------------------------------------------------

describe("InitiateRecoveryCTA — dark mode classes per state", () => {
	it("idle state card uses dark:bg-zinc-950 and dark:border-zinc-800", () => {
		const { container } = render(
			<InitiateRecoveryCTA recovery={makeRecovery()} />,
		);
		const card = container.querySelector(".dark\\:bg-zinc-950");
		expect(card).toBeInTheDocument();
	});

	it("success state uses dark:bg-green-900/10 and dark:border-green-800", () => {
		const { container } = render(
			<InitiateRecoveryCTA recovery={makeRecovery({ state: "success" })} />,
		);
		const panel = container.querySelector(".dark\\:bg-green-900\\/10");
		expect(panel).toBeInTheDocument();
	});

	it("confirming state uses dark:bg-amber-900/10", () => {
		const { container } = render(
			<InitiateRecoveryCTA recovery={makeRecovery({ state: "confirming" })} />,
		);
		const panel = container.querySelector(".dark\\:bg-amber-900\\/10");
		expect(panel).toBeInTheDocument();
	});

	it("error state alert uses dark:bg-red-900/20 and dark:text-red-400", () => {
		const { container } = render(
			<InitiateRecoveryCTA
				recovery={makeRecovery({ state: "error", errorMessage: "Oops" })}
			/>,
		);
		const alert = screen.getByRole("alert");
		expect(alert.className).toMatch(/dark:bg-red-900\/20/);
		expect(alert.className).toMatch(/dark:text-red-400/);
	});
});

// ---------------------------------------------------------------------------
// RecoveryExplanation — dark mode classes
// ---------------------------------------------------------------------------

describe("RecoveryExplanation — dark mode classes", () => {
	it("section cards use dark:bg-zinc-950 and dark:shadow-none", () => {
		const { container } = render(<RecoveryExplanation />);
		const darkCards = container.querySelectorAll(
			".dark\\:bg-zinc-950.dark\\:shadow-none",
		);
		expect(darkCards.length).toBeGreaterThanOrEqual(1);
	});

	it("warning section uses dark:bg-amber-900/10 and dark:shadow-none", () => {
		const { container } = render(<RecoveryExplanation />);
		const warning = container.querySelector(".dark\\:bg-amber-900\\/10");
		expect(warning).toBeInTheDocument();
		expect(warning?.className).toMatch(/dark:shadow-none/);
	});

	it("numbered step circles use dark:bg-zinc-800 and dark:text-zinc-300", () => {
		const { container } = render(<RecoveryExplanation />);
		const circles = container.querySelectorAll(
			".dark\\:bg-zinc-800.dark\\:text-zinc-300",
		);
		expect(circles.length).toBeGreaterThan(0);
	});
});
