/**
 * Tests for AuthLoadingSkeleton (issue #44 — auth loading skeleton)
 *
 * These tests verify that the full-page skeleton:
 * - Renders without crashing
 * - Has correct ARIA attributes for accessibility
 * - Renders the expected structural skeleton elements
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthLoadingSkeleton } from "../AuthLoadingSkeleton";

describe("AuthLoadingSkeleton", () => {
	it("renders without crashing", () => {
		render(<AuthLoadingSkeleton />);
		expect(screen.getByTestId("auth-loading-skeleton")).toBeInTheDocument();
	});

	it("has aria-busy set to true for accessibility", () => {
		render(<AuthLoadingSkeleton />);
		const skeleton = screen.getByTestId("auth-loading-skeleton");
		expect(skeleton).toHaveAttribute("aria-busy", "true");
	});

	it("has an accessible label", () => {
		render(<AuthLoadingSkeleton />);
		expect(screen.getByLabelText("Loading application")).toBeInTheDocument();
	});

	it("renders sidebar nav skeleton items", () => {
		const { container } = render(<AuthLoadingSkeleton />);
		// 6 nav item rows inside the sidebar nav
		const navItems = container.querySelectorAll("nav .animate-pulse");
		expect(navItems.length).toBeGreaterThanOrEqual(6);
	});

	it("renders content card skeletons in main area", () => {
		const { container } = render(<AuthLoadingSkeleton />);
		// At least 3 content cards in the grid
		const cards = container.querySelectorAll("main .rounded-xl");
		expect(cards.length).toBeGreaterThanOrEqual(3);
	});

	it("renders the sticky TopNav header skeleton", () => {
		const { container } = render(<AuthLoadingSkeleton />);
		expect(container.querySelector("header")).toBeInTheDocument();
	});

	it("renders a table skeleton inside the main content area", () => {
		const { container } = render(<AuthLoadingSkeleton />);
		// Table skeleton has a divide-y child for row items
		const tableRows = container.querySelectorAll("main .divide-y > div");
		expect(tableRows.length).toBeGreaterThanOrEqual(5);
	});

	it("renders animated pulse skeleton items", () => {
		const { container } = render(<AuthLoadingSkeleton />);
		const pulseItems = container.querySelectorAll(".animate-pulse");
		expect(pulseItems.length).toBeGreaterThan(0);
	});

	it("sidebar wrapper is hidden on mobile via CSS class", () => {
		const { container } = render(<AuthLoadingSkeleton />);
		// Sidebar uses hidden lg:flex — not visible on mobile
		const sidebar = container.querySelector(".hidden.lg\\:flex");
		expect(sidebar).toBeInTheDocument();
	});
});
