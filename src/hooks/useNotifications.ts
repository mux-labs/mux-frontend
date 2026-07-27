"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api/config";
import type { AppNotification } from "@/types/notification";

interface RawNotification extends Omit<AppNotification, "createdAt"> {
	createdAt: string;
}

function normalizeNotification(raw: RawNotification): AppNotification {
	return { ...raw, createdAt: new Date(raw.createdAt) };
}

interface UseNotificationsResult {
	notifications: AppNotification[];
	unreadCount: number;
	loading: boolean;
	error: string | null;
	refetch: () => void;
	markAllRead: () => void;
}

/**
 * Stub notifications-center data source. Fetches the mock notifications
 * endpoint; marking as read is local-only until a real backend lands.
 */
export function useNotifications(): UseNotificationsResult {
	const [notifications, setNotifications] = useState<AppNotification[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [tick, setTick] = useState(0);

	const refetch = useCallback(() => setTick((t) => t + 1), []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: tick is the refetch trigger
	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);

		const base = getApiBaseUrl();
		const url = base ? `${base}/notifications` : "/api/notifications";

		fetch(url)
			.then((res) => {
				if (!res.ok) throw new Error(`Request failed: ${res.status}`);
				return res.json() as Promise<RawNotification[]>;
			})
			.then((data) => {
				if (!cancelled) setNotifications(data.map(normalizeNotification));
			})
			.catch((err: unknown) => {
				if (!cancelled)
					setError(
						err instanceof Error
							? err.message
							: "Failed to load notifications.",
					);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [tick]);

	const markAllRead = useCallback(() => {
		setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
	}, []);

	const unreadCount = notifications.filter((n) => !n.read).length;

	return { notifications, unreadCount, loading, error, refetch, markAllRead };
}
