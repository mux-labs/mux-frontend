/**
 * Tests for Sidebar — includes issue #469: active route highlighting
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "../Sidebar";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPathname = vi.fn(() => "/dashboard");

vi.mock("next/navigation", () => ({
	usePathname: () => mockPathname(),
}));

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({
		user: { name: "Jane Doe", email: "jane@example.com", role: "admin" },
		isLoading: false,
		isAuthenticated: true,
		signIn: vi.fn(),
		signOut: vi.fn(),
	}),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSidebar(pathname = "/dashboard") {
	mockPathname.mockReturnValue(pathname);
	return render(<Sidebar isOpen={true} onClose={vi.fn()} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Sidebar navigation", () => {
	it("includes API Keys and Spending Limits links and excludes Orders", () => {
		renderSidebar();
		expect(screen.getByRole("link", { name: /API Keys/i })).toHaveAttribute(
			"href",
			"/dashboard/api-keys",
		);
		expect(
			screen.getByRole("link", { name: /Spending Limits/i }),
		).toHaveAttribute("href", "/dashboard/spending-limits");
		expect(screen.queryByRole("link", { name: /Orders/i })).toBeNull();
	});
});

describe("Sidebar active route highlighting (#469)", () => {
	it("marks the Dashboard link as active on exact /dashboard route", () => {
		renderSidebar("/dashboard");
		const link = screen.getByTestId("sidebar-nav-dashboard");
		expect(link).toHaveAttribute("aria-current", "page");
	});

	it("does not mark Dashboard as active on a sub-route", () => {
		renderSidebar("/dashboard/wallets");
		const dashboardLink = screen.getByTestId("sidebar-nav-dashboard");
		expect(dashboardLink).not.toHaveAttribute("aria-current", "page");
	});

	it("marks the Wallets link as active on /dashboard/wallets", () => {
		renderSidebar("/dashboard/wallets");
		const link = screen.getByTestId("sidebar-nav-wallets");
		expect(link).toHaveAttribute("aria-current", "page");
	});

	it("marks the Analytics link as active on /dashboard/analytics", () => {
		renderSidebar("/dashboard/analytics");
		const link = screen.getByTestId("sidebar-nav-analytics");
		expect(link).toHaveAttribute("aria-current", "page");
	});

	it("marks the API Keys link as active on /dashboard/api-keys", () => {
		renderSidebar("/dashboard/api-keys");
		const link = screen.getByTestId("sidebar-nav-api-keys");
		expect(link).toHaveAttribute("aria-current", "page");
	});

	it("marks the Spending Limits link as active on /dashboard/spending-limits", () => {
		renderSidebar("/dashboard/spending-limits");
		const link = screen.getByTestId("sidebar-nav-spending-limits");
		expect(link).toHaveAttribute("aria-current", "page");
	});

	it("applies active style classes to the active link", () => {
		renderSidebar("/dashboard/wallets");
		const link = screen.getByTestId("sidebar-nav-wallets");
		expect(link.className).toContain("bg-blue-50");
		expect(link.className).toContain("text-blue-700");
	});

	it("does not apply active style classes to inactive links", () => {
		renderSidebar("/dashboard/wallets");
		const link = screen.getByTestId("sidebar-nav-analytics");
		expect(link.className).not.toContain("bg-blue-50");
		expect(link).not.toHaveAttribute("aria-current", "page");
	});

	it("only one link is active at a time on a specific route", () => {
		renderSidebar("/dashboard/api-keys");
		const activeLinks = screen
			.getAllByRole("link")
			.filter((el) => el.getAttribute("aria-current") === "page");
		expect(activeLinks).toHaveLength(1);
	});
});
