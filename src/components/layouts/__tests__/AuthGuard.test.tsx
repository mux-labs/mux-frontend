/**
 * Tests for #466: Add auth loading skeleton on protected routes.
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockReplace }),
	usePathname: () => "/demo/dashboard",
}));

// AuthContext mock — we control isLoading and isAuthenticated per test
const mockUseAuth = vi.fn();

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => mockUseAuth(),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { AuthGuard, DashboardSkeleton } from "../AuthGuard";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AuthGuard — auth loading skeleton on protected routes (#466)", () => {
	it("shows the dashboard skeleton while auth is loading", () => {
		mockUseAuth.mockReturnValue({
			isLoading: true,
			isAuthenticated: false,
		});

		render(
			<AuthGuard>
				<div data-testid="protected-content">Dashboard content</div>
			</AuthGuard>,
		);

		expect(screen.getByTestId("dashboard-auth-skeleton")).toBeDefined();
		expect(screen.queryByTestId("protected-content")).toBeNull();
	});

	it("renders protected content once auth has loaded and user is authenticated", () => {
		mockUseAuth.mockReturnValue({
			isLoading: false,
			isAuthenticated: true,
		});

		render(
			<AuthGuard>
				<div data-testid="protected-content">Dashboard content</div>
			</AuthGuard>,
		);

		expect(screen.getByTestId("protected-content")).toBeDefined();
		expect(screen.queryByTestId("dashboard-auth-skeleton")).toBeNull();
	});

	it("shows skeleton and redirects when auth loaded but user is not authenticated", () => {
		mockReplace.mockClear();
		window.history.replaceState({}, "", "/dashboard/settings");
		mockUseAuth.mockReturnValue({
			isLoading: false,
			isAuthenticated: false,
		});

		render(
			<AuthGuard>
				<div data-testid="protected-content">Dashboard content</div>
			</AuthGuard>,
		);

		expect(screen.getByTestId("dashboard-auth-skeleton")).toBeDefined();
		expect(screen.queryByTestId("protected-content")).toBeNull();
		// Redirect is delegated to useSessionGuard (#624).
		expect(mockReplace).toHaveBeenCalledWith(
			"/login?callbackUrl=%2Fdashboard%2Fsettings",
		);
	});

	it("DashboardSkeleton has correct aria attributes", () => {
		render(<DashboardSkeleton />);
		const skeleton = screen.getByTestId("dashboard-auth-skeleton");
		expect(skeleton.getAttribute("aria-busy")).toBe("true");
		expect(skeleton.getAttribute("aria-label")).toBe("Loading dashboard");
	});
});
