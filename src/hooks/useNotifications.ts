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
 * Notifications-center data source. Fetches the real backend notifications
 * feed (via `/api/notifications`, which proxies to the backend when
 * configured) and persists mark-read through the same endpoint.
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
		// Optimistic local update, then persist via the backend-wired
		// notifications endpoint so mark-read survives a refresh.
		setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

		const base = getApiBaseUrl();
		const url = base ? `${base}/notifications/read` : "/api/notifications";

		fetch(url, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ markAll: true }),
		}).catch(() => {
			// Persistence failures are non-critical; the optimistic local
			// update stands and the next refetch will reconcile with the
			// backend's actual state.
		});
	}, []);

	const unreadCount = notifications.filter((n) => !n.read).length;

	return { notifications, unreadCount, loading, error, refetch, markAllRead };
}
