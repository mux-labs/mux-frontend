/**
 * Tests verifying documented props for Recovery UI components (#320).
 *
 * Each describe block maps 1-to-1 to a component and covers every prop
 * listed in its JSDoc, including default values and edge cases.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RecoveryStatus } from "../RecoveryStatus";
import { RecoveryDocsLink } from "../RecoveryDocsLink";
import { RecoveryFAQ } from "../RecoveryFAQ";
import { RecoveryLoadingState } from "../RecoveryLoadingState";

// ---------------------------------------------------------------------------
// RecoveryStatus props
// ---------------------------------------------------------------------------
describe("RecoveryStatus — documented props", () => {
	it("defaults to 'active' status when no prop is given", () => {
		render(<RecoveryStatus />);
		expect(
			screen.getByLabelText(/recovery status: active/i),
		).toBeInTheDocument();
	});

	it("accepts all documented RecoveryStatusValue variants", () => {
		const values = [
			"active",
			"monitoring",
			"ready",
			"error",
			"disconnected",
			"unknown",
		] as const;

		for (const status of values) {
			const { unmount } = render(<RecoveryStatus status={status} />);
			expect(
				screen.getByLabelText(new RegExp(`recovery status: ${status}`, "i")),
			).toBeInTheDocument();
			unmount();
		}
	});

	it("falls back to 'unknown' for an unrecognised status value", () => {
		// Cast to bypass TypeScript so we can test the runtime guard
		render(<RecoveryStatus status={"stale" as never} />);
		expect(
			screen.getByLabelText(/recovery status: unknown/i),
		).toBeInTheDocument();
	});

	it("merges className onto the root badge", () => {
		render(<RecoveryStatus className="custom-badge" />);
		const badge = screen.getByLabelText(/recovery status: active/i);
		expect(badge).toHaveClass("custom-badge");
	});
});

// ---------------------------------------------------------------------------
// RecoveryDocsLink props
// ---------------------------------------------------------------------------
describe("RecoveryDocsLink — documented props", () => {
	it("defaults href to https://docs.mux.network/recovery", () => {
		render(<RecoveryDocsLink />);
		expect(screen.getByRole("link")).toHaveAttribute(
			"href",
			"https://docs.mux.network/recovery",
		);
	});

	it("accepts a custom href prop", () => {
		render(<RecoveryDocsLink href="https://example.com/docs" />);
		expect(screen.getByRole("link")).toHaveAttribute(
			"href",
			"https://example.com/docs",
		);
	});

	it("renders custom children as the link label", () => {
		render(<RecoveryDocsLink>View Guide</RecoveryDocsLink>);
		expect(screen.getByText("View Guide")).toBeInTheDocument();
	});

	it("defaults children to 'Read Docs'", () => {
		render(<RecoveryDocsLink />);
		expect(screen.getByText("Read Docs")).toBeInTheDocument();
	});

	it("merges className onto the root anchor", () => {
		render(<RecoveryDocsLink className="extra-class" />);
		expect(screen.getByRole("link")).toHaveClass("extra-class");
	});

	it("always opens in a new tab with rel=noopener noreferrer", () => {
		render(<RecoveryDocsLink />);
		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener noreferrer");
	});
});

// ---------------------------------------------------------------------------
// RecoveryFAQ props
// ---------------------------------------------------------------------------
describe("RecoveryFAQ — documented props", () => {
	it("renders default FAQ_ITEMS when no items prop is given", () => {
		render(<RecoveryFAQ />);
		// Default list has 6 items
		expect(screen.getAllByRole("listitem").length).toBe(6);
	});

	it("accepts a custom items array", () => {
		const items = [
			{ id: "a", question: "Q alpha?", answer: "A alpha." },
			{ id: "b", question: "Q beta?", answer: "A beta." },
		];
		render(<RecoveryFAQ items={items} />);
		expect(screen.getByText("Q alpha?")).toBeInTheDocument();
		expect(screen.getByText("Q beta?")).toBeInTheDocument();
		expect(screen.getAllByRole("listitem").length).toBe(2);
	});

	it("shows a fallback message when items is an empty array", () => {
		render(<RecoveryFAQ items={[]} />);
		expect(screen.getByText(/no faq items available/i)).toBeInTheDocument();
	});

	it("merges className onto the root section", () => {
		render(<RecoveryFAQ className="faq-wrapper" />);
		expect(
			screen.getByRole("region", { name: /frequently asked questions/i }),
		).toHaveClass("faq-wrapper");
	});
});

// ---------------------------------------------------------------------------
// RecoveryLoadingState props
// ---------------------------------------------------------------------------
describe("RecoveryLoadingState — documented props", () => {
	it("defaults message to 'Loading recovery status…'", () => {
		render(<RecoveryLoadingState />);
		expect(
			screen.getByRole("status", { name: /loading recovery status/i }),
		).toBeInTheDocument();
	});

	it("accepts a custom message prop used as aria-label", () => {
		render(<RecoveryLoadingState message="Fetching wallet status…" />);
		expect(
			screen.getByRole("status", { name: /fetching wallet status/i }),
		).toBeInTheDocument();
	});

	it("renders aria-busy=true while loading", () => {
		render(<RecoveryLoadingState />);
		expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
	});

	it("merges className onto the root wrapper", () => {
		render(<RecoveryLoadingState className="loading-root" />);
		expect(screen.getByRole("status")).toHaveClass("loading-root");
	});
});
