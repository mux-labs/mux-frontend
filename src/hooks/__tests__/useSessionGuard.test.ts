/**
 * Tests for `useSessionGuard` (#624).
 *
 * The hook is the documented client-side complement to the middleware route
 * protection: once auth state has finished rehydrating, an unauthenticated
 * visitor to a protected page is bounced to `/login` with a `callbackUrl`.
 * `AuthGuard` (and therefore every `/dashboard/*` route via `DashboardLayout`)
 * delegates its redirect to this hook, so a regression here re-opens the
 * "stale session renders the real dashboard" gap.
 */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace }),
}));

const mockUseAuth = vi.fn();
vi.mock("@/context/AuthContext", () => ({
	useAuth: () => mockUseAuth(),
}));

import { useSessionGuard } from "../useSessionGuard";

beforeEach(() => {
	replace.mockClear();
	mockUseAuth.mockReset();
	window.history.replaceState({}, "", "/dashboard/wallets");
});

describe("useSessionGuard", () => {
	it("does not redirect while auth is still loading", () => {
		mockUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false });

		renderHook(() => useSessionGuard());

		expect(replace).not.toHaveBeenCalled();
	});

	it("does not redirect an authenticated user", () => {
		mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true });

		renderHook(() => useSessionGuard());

		expect(replace).not.toHaveBeenCalled();
	});

	it("redirects an unauthenticated user to /login with the current path as callbackUrl", () => {
		mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false });

		renderHook(() => useSessionGuard());

		expect(replace).toHaveBeenCalledWith(
			"/login?callbackUrl=%2Fdashboard%2Fwallets",
		);
	});

	it("honours a custom redirect target", () => {
		mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false });

		renderHook(() => useSessionGuard("/demo"));

		expect(replace).toHaveBeenCalledWith(
			"/demo?callbackUrl=%2Fdashboard%2Fwallets",
		);
	});
});
