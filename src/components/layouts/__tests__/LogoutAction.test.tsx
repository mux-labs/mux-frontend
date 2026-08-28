/**
 * Tests for logout action (issue #45 — add logout action)
 *
 * Verifies that:
 * - Sidebar renders a "Sign out" button when user is authenticated
 * - Clicking "Sign out" in Sidebar clears the session
 * - TopNav renders a "Sign out" option in the user dropdown
 * - Clicking "Sign out" in TopNav clears the session
 * - Logout button is absent when no user is signed in
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/context/AuthContext";
import { NetworkProvider } from "@/context/NetworkContext";
import { Sidebar } from "../Sidebar";
import { TopNav } from "../TopNav";

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

/** Seed sessionStorage with a valid authenticated session. */
function seedSession() {
	const record = {
		user: { name: "Jane Doe", email: "jane@example.com", role: "admin" },
		expiresAt: Date.now() + 60_000,
	};
	sessionStorage.setItem("mux_auth_user", JSON.stringify(record));
}

function renderSidebar() {
	return render(
		<AuthProvider>
			<NetworkProvider>
				<Sidebar isOpen={true} onClose={vi.fn()} />
			</NetworkProvider>
		</AuthProvider>,
	);
}

function renderTopNav() {
	return render(
		<AuthProvider>
			<NetworkProvider>
				<TopNav onMenuClick={vi.fn()} />
			</NetworkProvider>
		</AuthProvider>,
	);
}

// ---------------------------------------------------------------------------
// Sidebar logout tests
// ---------------------------------------------------------------------------

describe("Logout action — Sidebar (issue #45)", () => {
	afterEach(() => {
		sessionStorage.clear();
	});

	it("renders the Sign out button when user is authenticated", async () => {
		seedSession();
		renderSidebar();
		const btn = await screen.findByTestId("sidebar-logout-button");
		expect(btn).toBeInTheDocument();
		expect(btn).toHaveTextContent("Sign out");
	});

	it("clears the session when Sign out is clicked", async () => {
		seedSession();
		renderSidebar();
		const btn = await screen.findByTestId("sidebar-logout-button");
		fireEvent.click(btn);
		await waitFor(() => {
			expect(sessionStorage.getItem("mux_auth_user")).toBeNull();
		});
	});

	it("does not render Sign out button when no user is signed in", () => {
		// No session seeded
		renderSidebar();
		expect(
			screen.queryByTestId("sidebar-logout-button"),
		).not.toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// TopNav logout tests
// ---------------------------------------------------------------------------

describe("Logout action — TopNav (issue #45)", () => {
	afterEach(() => {
		sessionStorage.clear();
	});

	it("shows Sign out option in user dropdown when authenticated", async () => {
		seedSession();
		renderTopNav();

		// Open the user dropdown
		const userMenuBtn = await screen.findByRole("button", {
			name: (_, el) => el.getAttribute("aria-haspopup") === "true",
		});
		fireEvent.click(userMenuBtn);

		const logoutBtn = await screen.findByTestId("logout-button");
		expect(logoutBtn).toBeInTheDocument();
		expect(logoutBtn).toHaveTextContent("Sign out");
	});

	it("clears the session when Sign out is clicked from TopNav", async () => {
		seedSession();
		renderTopNav();

		// Open the user dropdown
		const userMenuBtn = await screen.findByRole("button", {
			name: (_, el) => el.getAttribute("aria-haspopup") === "true",
		});
		fireEvent.click(userMenuBtn);

		const logoutBtn = await screen.findByTestId("logout-button");
		fireEvent.click(logoutBtn);

		await waitFor(() => {
			expect(sessionStorage.getItem("mux_auth_user")).toBeNull();
		});
	});

	it("closes the dropdown after Sign out is clicked", async () => {
		seedSession();
		renderTopNav();

		const userMenuBtn = await screen.findByRole("button", {
			name: (_, el) => el.getAttribute("aria-haspopup") === "true",
		});
		fireEvent.click(userMenuBtn);

		const logoutBtn = await screen.findByTestId("logout-button");
		fireEvent.click(logoutBtn);

		await waitFor(() => {
			expect(screen.queryByTestId("logout-button")).not.toBeInTheDocument();
		});
	});
});
