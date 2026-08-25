import type { AppNotification } from "@/types/notification";

/**
 * Local/dev-only mock store for the notifications center.
 *
 * `src/app/api/notifications/route.ts` only reads/writes this store as a
 * fallback when no backend URL (`NEXT_PUBLIC_API_URL`/legacy aliases) is
 * configured, so local dev/CI keeps working without a running API server.
 * In any environment with a backend configured, list and mark-read are
 * served by the real backend notifications API instead.
 */
export const dummyNotifications: AppNotification[] = [
	{
		id: "notif-001",
		title: "Wallet funded",
		description: "wallet-001 received 250.00 XLM on mainnet.",
		createdAt: new Date("2025-01-21T09:12:00Z"),
		read: false,
		network: "mainnet",
	},
	{
		id: "notif-002",
		title: "Spending limit updated",
		description: "Daily spending limit for wallet-004 changed to 5,000 XLM.",
		createdAt: new Date("2025-01-20T16:40:00Z"),
		read: false,
		network: "testnet",
	},
	{
		id: "notif-003",
		title: "API key created",
		description: "A new API key was generated for this workspace.",
		createdAt: new Date("2025-01-19T11:05:00Z"),
		read: true,
	},
];

/** Returns a snapshot copy of the current mock notifications. */
export function getNotifications(): AppNotification[] {
	return dummyNotifications.map((notification) => ({ ...notification }));
}

/**
 * Marks a single mock notification as read.
 * Returns the updated notification, or `null` if no notification has `id`.
 */
export function markNotificationRead(id: string): AppNotification | null {
	const notification = dummyNotifications.find((n) => n.id === id);
	if (!notification) return null;
	notification.read = true;
	return { ...notification };
}

/** Marks every mock notification as read and returns the updated list. */
export function markAllNotificationsRead(): AppNotification[] {
	for (const notification of dummyNotifications) {
		notification.read = true;
	}
	return getNotifications();
}
