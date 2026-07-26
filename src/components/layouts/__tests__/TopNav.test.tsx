/**
 * Tests for #467: Add logout action in top navigation.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockReplace }),
	usePathname: () => "/demo/dashboard",
}));

const mockSignOut = vi.fn();

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({
		user: { name: "Tali Creator", email: "tali@example.com", role: "developer" },
		signOut: mockSignOut,
	}),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { TopNav } from "../TopNav";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TopNav logout action (#467)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the user menu button", () => {
		render(<TopNav onMenuClick={vi.fn()} />);
		expect(screen.getByTestId("user-menu-button")).toBeDefined();
	});

	it("opens the user menu dropdown on click", () => {
		render(<TopNav onMenuClick={vi.fn()} />);
		expect(screen.queryByTestId("user-menu")).toBeNull();

		fireEvent.click(screen.getByTestId("user-menu-button"));

		expect(screen.getByTestId("user-menu")).toBeDefined();
	});

	it("shows the logout button inside the dropdown", () => {
		render(<TopNav onMenuClick={vi.fn()} />);
		fireEvent.click(screen.getByTestId("user-menu-button"));

		expect(screen.getByTestId("logout-button")).toBeDefined();
		expect(screen.getByTestId("logout-button").textContent).toContain(
			"Sign out",
		);
	});

	it("shows the signed-in user email in the dropdown", () => {
		render(<TopNav onMenuClick={vi.fn()} />);
		fireEvent.click(screen.getByTestId("user-menu-button"));

		expect(screen.getByTestId("user-menu-email").textContent).toBe(
			"tali@example.com",
		);
	});

	it("calls signOut and redirects to /login when logout is clicked", () => {
		render(<TopNav onMenuClick={vi.fn()} />);
		fireEvent.click(screen.getByTestId("user-menu-button"));
		fireEvent.click(screen.getByTestId("logout-button"));

		expect(mockSignOut).toHaveBeenCalledTimes(1);
		expect(mockReplace).toHaveBeenCalledWith("/login");
	});

	it("closes the dropdown after logout", () => {
		render(<TopNav onMenuClick={vi.fn()} />);
		fireEvent.click(screen.getByTestId("user-menu-button"));
		fireEvent.click(screen.getByTestId("logout-button"));

		expect(screen.queryByTestId("user-menu")).toBeNull();
	});

	it("user menu button has correct aria attributes when closed", () => {
		render(<TopNav onMenuClick={vi.fn()} />);
		const btn = screen.getByTestId("user-menu-button");
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(btn.getAttribute("aria-haspopup")).toBe("true");
	});

	it("user menu button has aria-expanded=true when open", () => {
		render(<TopNav onMenuClick={vi.fn()} />);
		fireEvent.click(screen.getByTestId("user-menu-button"));
		const btn = screen.getByTestId("user-menu-button");
		expect(btn.getAttribute("aria-expanded")).toBe("true");
	});
});
