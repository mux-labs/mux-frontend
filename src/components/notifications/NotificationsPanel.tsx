"use client";

import { Bell } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RelativeTimestamp } from "@/components/ui/RelativeTimestamp";
import { Skeleton } from "@/components/ui/Skeleton";
import { useNotifications } from "@/hooks/useNotifications";

interface NotificationsPanelProps {
	open: boolean;
	onClose: () => void;
}

/**
 * Dropdown stub for the notifications center. Reuses the app's existing
 * loading/error/empty conventions rather than introducing new ones.
 */
export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
	const panelRef = useRef<HTMLDivElement>(null);
	const { notifications, unreadCount, loading, error, refetch, markAllRead } =
		useNotifications();

	useEffect(() => {
		if (!open) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		const onClickOutside = (e: MouseEvent) => {
			if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
				onClose();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		document.addEventListener("mousedown", onClickOutside);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("mousedown", onClickOutside);
		};
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div
			ref={panelRef}
			role="dialog"
			aria-label="Notifications"
			data-testid="notifications-panel"
			className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
		>
			<div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-zinc-800">
				<h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-50">
					Notifications
				</h2>
				{unreadCount > 0 && (
					<Button variant="ghost" size="sm" onClick={markAllRead}>
						Mark all read
					</Button>
				)}
			</div>

			<div className="max-h-96 overflow-y-auto">
				{loading ? (
					<div className="space-y-3 p-4">
						{[...Array(3)].map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
							<div key={i} className="flex items-start gap-3">
								<Skeleton className="h-8 w-8 shrink-0 rounded-full" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-3 w-3/4" />
									<Skeleton className="h-3 w-1/2" />
								</div>
							</div>
						))}
					</div>
				) : error ? (
					<div className="p-4 text-center">
						<p className="mb-3 text-sm text-red-600 dark:text-red-400">
							{error}
						</p>
						<Button size="sm" variant="outline" onClick={refetch}>
							Retry
						</Button>
					</div>
				) : notifications.length === 0 ? (
					<div className="flex flex-col items-center gap-2 p-8 text-center">
						<Bell
							className="h-8 w-8 text-gray-300 dark:text-zinc-600"
							aria-hidden="true"
						/>
						<p className="text-sm text-gray-500 dark:text-zinc-400">
							You&apos;re all caught up. No notifications yet.
						</p>
					</div>
				) : (
					<ul className="divide-y divide-gray-100 dark:divide-zinc-800">
						{notifications.map((notification) => (
							<li
								key={notification.id}
								data-testid={`notification-${notification.id}`}
								className={`px-4 py-3 ${
									notification.read
										? ""
										: "bg-blue-50/60 dark:bg-blue-950/20"
								}`}
							>
								<div className="flex items-start justify-between gap-2">
									<p className="text-sm font-medium text-gray-900 dark:text-zinc-50">
										{notification.title}
									</p>
									{!notification.read && (
										<span
											className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500"
											aria-label="Unread"
										/>
									)}
								</div>
								<p className="mt-0.5 text-sm text-gray-500 dark:text-zinc-400">
									{notification.description}
								</p>
								<RelativeTimestamp
									date={notification.createdAt}
									className="mt-1 block text-xs text-gray-400 dark:text-zinc-500"
								/>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
