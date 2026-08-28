/**
 * Tests for TopNav — issue #468: Show user initials avatar in top nav
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TopNav } from "../TopNav";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next/navigation", () => ({
	usePathname: () => "/dashboard",
	useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/context/AuthContext", () => ({
	useAuth: vi.fn(),
}));

vi.mock("@/context/NetworkContext", () => ({
	useNetwork: () => ({ network: "testnet", setNetwork: vi.fn() }),
}));

vi.mock("@/hooks/useDarkMode", () => ({
	useDarkMode: () => ({ isDark: false, toggle: vi.fn() }),
}));

vi.mock("@/hooks/useNotifications", () => ({
	useNotifications: () => ({
		notifications: [],
		unreadCount: 0,
		loading: false,
		error: null,
		refetch: vi.fn(),
		markAllRead: vi.fn(),
	}),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { useAuth } from "@/context/AuthContext";
const mockUseAuth = vi.mocked(useAuth);

function renderTopNav() {
	return render(<TopNav onMenuClick={vi.fn()} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TopNav — user initials avatar (#468)", () => {
	it("shows initials avatar when user is authenticated", () => {
		mockUseAuth.mockReturnValue({
			user: { name: "Jane Doe", email: "jane@example.com", role: "admin" },
			isLoading: false,
			isAuthenticated: true,
			signIn: vi.fn(),
			signOut: vi.fn(),
		});
		renderTopNav();
		const avatar = screen.getByTestId("user-avatar");
		expect(avatar).toBeInTheDocument();
		expect(avatar).toHaveTextContent("JD");
	});

	it("shows correct single initial for a single-name user", () => {
		mockUseAuth.mockReturnValue({
			user: { name: "Alice", email: "alice@example.com", role: "developer" },
			isLoading: false,
			isAuthenticated: true,
			signIn: vi.fn(),
			signOut: vi.fn(),
		});
		renderTopNav();
		const avatar = screen.getByTestId("user-avatar");
		expect(avatar).toHaveTextContent("A");
	});

	it("caps initials at 2 characters for names with more than 2 words", () => {
		mockUseAuth.mockReturnValue({
			user: { name: "John Paul Smith", email: "jps@example.com", role: "admin" },
			isLoading: false,
			isAuthenticated: true,
			signIn: vi.fn(),
			signOut: vi.fn(),
		});
		renderTopNav();
		const avatar = screen.getByTestId("user-avatar");
		expect(avatar.textContent).toHaveLength(2);
		expect(avatar).toHaveTextContent("JP");
	});

	it("shows loading skeleton while auth is loading", () => {
		mockUseAuth.mockReturnValue({
			user: null,
			isLoading: true,
			isAuthenticated: false,
			signIn: vi.fn(),
			signOut: vi.fn(),
		});
		renderTopNav();
		expect(screen.getByTestId("user-avatar-skeleton")).toBeInTheDocument();
		expect(screen.queryByTestId("user-avatar")).not.toBeInTheDocument();
	});

	it("shows empty avatar placeholder when not authenticated", () => {
		mockUseAuth.mockReturnValue({
			user: null,
			isLoading: false,
			isAuthenticated: false,
			signIn: vi.fn(),
			signOut: vi.fn(),
		});
		renderTopNav();
		expect(screen.getByTestId("user-avatar-empty")).toBeInTheDocument();
		expect(screen.queryByTestId("user-avatar")).not.toBeInTheDocument();
	});

	it("avatar has accessible aria-label containing the user name", () => {
		mockUseAuth.mockReturnValue({
			user: { name: "Jane Doe", email: "jane@example.com", role: "admin" },
			isLoading: false,
			isAuthenticated: true,
			signIn: vi.fn(),
			signOut: vi.fn(),
		});
		renderTopNav();
		const avatar = screen.getByTestId("user-avatar");
		expect(avatar).toHaveAttribute("aria-label", "Jane Doe avatar");
	});
});
