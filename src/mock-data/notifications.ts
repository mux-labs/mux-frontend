import type { AppNotification } from "@/types/notification";

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
