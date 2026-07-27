import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { useNotifications } from "@/hooks/useNotifications";

vi.mock("@/hooks/useNotifications", () => ({
	useNotifications: vi.fn(),
}));

const baseState = {
	notifications: [],
	unreadCount: 0,
	loading: false,
	error: null,
	refetch: vi.fn(),
	markAllRead: vi.fn(),
};

describe("NotificationsPanel", () => {
	beforeEach(() => {
		vi.mocked(useNotifications).mockReturnValue(baseState);
	});

	it("renders nothing when closed", () => {
		render(<NotificationsPanel open={false} onClose={vi.fn()} />);
		expect(screen.queryByTestId("notifications-panel")).not.toBeInTheDocument();
	});

	it("shows a loading skeleton while fetching", () => {
		vi.mocked(useNotifications).mockReturnValue({
			...baseState,
			loading: true,
		});
		render(<NotificationsPanel open onClose={vi.fn()} />);
		expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
	});

	it("shows an empty state when there are no notifications", () => {
		render(<NotificationsPanel open onClose={vi.fn()} />);
		expect(
			screen.getByText(/You're all caught up/i),
		).toBeInTheDocument();
	});

	it("shows an error state with retry when the fetch fails", () => {
		const refetch = vi.fn();
		vi.mocked(useNotifications).mockReturnValue({
			...baseState,
			error: "Failed to load notifications.",
			refetch,
		});
		render(<NotificationsPanel open onClose={vi.fn()} />);
		expect(
			screen.getByText("Failed to load notifications."),
		).toBeInTheDocument();
		screen.getByRole("button", { name: /retry/i }).click();
		expect(refetch).toHaveBeenCalled();
	});

	it("renders notifications and a mark-all-read action when unread items exist", () => {
		vi.mocked(useNotifications).mockReturnValue({
			...baseState,
			unreadCount: 1,
			notifications: [
				{
					id: "notif-001",
					title: "Wallet funded",
					description: "wallet-001 received 250.00 XLM on mainnet.",
					createdAt: new Date("2025-01-21T09:12:00Z"),
					read: false,
					network: "mainnet",
				},
			],
		});
		render(<NotificationsPanel open onClose={vi.fn()} />);
		expect(screen.getByTestId("notification-notif-001")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /mark all read/i }),
		).toBeInTheDocument();
	});
});
