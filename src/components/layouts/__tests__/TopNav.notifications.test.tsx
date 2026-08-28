/**
 * Tests for the TopNav notifications bell (#618).
 *
 * The bell used to be a dead button with a permanently-on fake red dot, and
 * NotificationsPanel was never mounted anywhere. These tests lock in the
 * wiring: the dot reflects the real unread count, and clicking the bell
 * mounts the panel.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TopNav } from "../TopNav";

vi.mock("next/navigation", () => ({
	usePathname: () => "/dashboard",
	useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({ user: null, isLoading: false, signOut: vi.fn() }),
}));

vi.mock("@/context/NetworkContext", () => ({
	useNetwork: () => ({ network: "testnet", setNetwork: vi.fn() }),
}));

vi.mock("@/hooks/useDarkMode", () => ({
	useDarkMode: () => ({ isDark: false, toggle: vi.fn() }),
}));

const refetch = vi.fn();
const markAllRead = vi.fn();
let unreadCount = 0;
let notifications: unknown[] = [];

vi.mock("@/hooks/useNotifications", () => ({
	useNotifications: () => ({
		notifications,
		unreadCount,
		loading: false,
		error: null,
		refetch,
		markAllRead,
	}),
}));

beforeEach(() => {
	refetch.mockClear();
	markAllRead.mockClear();
	unreadCount = 0;
	notifications = [];
});

describe("TopNav notifications bell (#618)", () => {
	it("does not render the unread dot when there are no unread notifications", () => {
		render(<TopNav onMenuClick={vi.fn()} />);
		expect(
			screen.queryByTestId("notifications-unread-dot"),
		).not.toBeInTheDocument();
	});

	it("renders the unread count in the dot when notifications are unread", () => {
		unreadCount = 3;
		render(<TopNav onMenuClick={vi.fn()} />);
		expect(screen.getByTestId("notifications-unread-dot")).toHaveTextContent(
			"3",
		);
		expect(
			screen.getByRole("button", { name: /view notifications \(3 unread\)/i }),
		).toBeInTheDocument();
	});

	it("mounts NotificationsPanel when the bell is clicked", () => {
		render(<TopNav onMenuClick={vi.fn()} />);
		expect(
			screen.queryByTestId("notifications-panel"),
		).not.toBeInTheDocument();

		fireEvent.click(screen.getByTestId("notifications-bell"));
		expect(screen.getByTestId("notifications-panel")).toBeInTheDocument();
	});

	it("refetches to reconcile the badge when the panel closes", () => {
		render(<TopNav onMenuClick={vi.fn()} />);
		fireEvent.click(screen.getByTestId("notifications-bell"));
		fireEvent.keyDown(window, { key: "Escape" });
		expect(refetch).toHaveBeenCalled();
	});
});
