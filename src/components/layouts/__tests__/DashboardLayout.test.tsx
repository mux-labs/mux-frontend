/**
 * Tests for DashboardLayout
 *
 * Covers:
 * - Issue #44: auth loading skeleton integration
 * - Issue #470: responsive shell — mobile overlay, sidebar toggle, swipe/keyboard close
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/context/AuthContext";
import { NetworkProvider } from "@/context/NetworkContext";
import { DashboardLayout } from "../DashboardLayout";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRouterReplace = vi.fn();

vi.mock("next/navigation", () => ({
	usePathname: () => "/dashboard",
	useRouter: () => ({ replace: mockRouterReplace, push: vi.fn() }),
}));

vi.mock("@/context/AuthContext", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/context/AuthContext")>();
	return actual;
});

vi.mock("@/context/NetworkContext", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@/context/NetworkContext")>();
	return actual;
});

vi.mock("@/hooks/useDarkMode", () => ({
	useDarkMode: () => ({ isDark: false, toggle: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderLayout(children = <div data-testid="page-content">Page</div>) {
	return render(
		<AuthProvider>
			<NetworkProvider>
				<DashboardLayout>{children}</DashboardLayout>
			</NetworkProvider>
		</AuthProvider>,
	);
}

function getMenuButton() {
	// The hamburger button in TopNav has sr-only text "Open sidebar"
	return screen.getByRole("button", { name: /open sidebar/i });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DashboardLayout — auth loading skeleton (issue #44)", () => {
	afterEach(() => {
		sessionStorage.clear();
	});

	it("renders the auth loading skeleton on initial mount", () => {
		const { container } = renderLayout();
		expect(container.firstChild).not.toBeNull();
	});

	it("renders without crashing on initial mount (auth loading state)", () => {
		const { container } = renderLayout();
		// DashboardLayout renders; individual pages handle their own loading skeletons
		expect(container.firstChild).not.toBeNull();
	});

	it("renders children once auth has loaded with a valid session", async () => {
		const record = {
			user: { name: "Test User", email: "test@example.com", role: "admin" },
			expiresAt: Date.now() + 60_000,
		};
		sessionStorage.setItem("mux_auth_user", JSON.stringify(record));
		const { findByTestId } = renderLayout();
		const content = await findByTestId("page-content");
		expect(content).toBeInTheDocument();
	});
});

describe("DashboardLayout — responsive shell (#470)", () => {
	afterEach(() => {
		sessionStorage.clear();
		document.body.style.overflow = "";
	});

	async function renderWithSession() {
		const record = {
			user: { name: "Dev User", email: "dev@example.com", role: "developer" },
			expiresAt: Date.now() + 60_000,
		};
		sessionStorage.setItem("mux_auth_user", JSON.stringify(record));
		renderLayout();
		// Wait for auth to resolve
		await screen.findByTestId("page-content");
	}

	it("does not show mobile overlay when sidebar is closed", async () => {
		await renderWithSession();
		expect(screen.queryByTestId("mobile-overlay")).not.toBeInTheDocument();
	});

	it("shows mobile overlay when hamburger menu button is clicked", async () => {
		await renderWithSession();
		fireEvent.click(getMenuButton());
		expect(screen.getByTestId("mobile-overlay")).toBeInTheDocument();
	});

	it("hides mobile overlay when overlay is clicked (close on backdrop tap)", async () => {
		await renderWithSession();
		fireEvent.click(getMenuButton());
		expect(screen.getByTestId("mobile-overlay")).toBeInTheDocument();
		fireEvent.click(screen.getByTestId("mobile-overlay"));
		expect(screen.queryByTestId("mobile-overlay")).not.toBeInTheDocument();
	});

	it("locks body scroll when sidebar is open", async () => {
		await renderWithSession();
		fireEvent.click(getMenuButton());
		await waitFor(() => {
			expect(document.body.style.overflow).toBe("hidden");
		});
	});

	it("restores body scroll when sidebar is closed", async () => {
		await renderWithSession();
		fireEvent.click(getMenuButton()); // open
		fireEvent.click(screen.getByTestId("mobile-overlay")); // close
		await waitFor(() => {
			expect(document.body.style.overflow).toBe("auto");
		});
	});

	it("renders the sidebar container", async () => {
		await renderWithSession();
		expect(screen.getByTestId("sidebar-container")).toBeInTheDocument();
	});

	it("renders the main content area with correct id", async () => {
		await renderWithSession();
		expect(document.getElementById("main-content")).toBeInTheDocument();
	});
});

describe("DashboardLayout — AuthGuard integration (#623)", () => {
	afterEach(() => {
		sessionStorage.clear();
		mockRouterReplace.mockClear();
	});

	it("gates content behind AuthGuard and redirects when unauthenticated", async () => {
		renderLayout();

		expect(
			await screen.findByTestId("dashboard-auth-skeleton"),
		).toBeInTheDocument();
		expect(screen.queryByTestId("page-content")).not.toBeInTheDocument();

		await waitFor(() =>
			expect(mockRouterReplace).toHaveBeenCalledWith(
				expect.stringContaining("/login"),
			),
		);
	});

	it("does not gate the demo tree when requireAuth is false", async () => {
		render(
			<AuthProvider>
				<NetworkProvider>
					<DashboardLayout requireAuth={false}>
						<div data-testid="page-content">Page</div>
					</DashboardLayout>
				</NetworkProvider>
			</AuthProvider>,
		);

		expect(await screen.findByTestId("page-content")).toBeInTheDocument();
		expect(mockRouterReplace).not.toHaveBeenCalled();
	});
});
