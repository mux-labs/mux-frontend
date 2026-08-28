import { NextResponse } from "next/server";
import { getApiBaseUrl, getUpstreamAuthHeaders } from "@/lib/api/config";
import {
	getNotifications,
	markAllNotificationsRead,
	markNotificationRead,
} from "@/mock-data/notifications";

/** 503 body returned when a production build has no notifications backend. */
const NO_BACKEND_RESPONSE = NextResponse.json(
	{
		error:
			"Notifications backend is not configured. Set NEXT_PUBLIC_API_URL — " +
			"mock notifications are not served in production.",
	},
	{ status: 503 },
);

function backendHeaders(): Record<string, string> {
	return {
		"content-type": "application/json",
		...getUpstreamAuthHeaders(),
	};
}

/**
 * GET /api/notifications
 *
 * Proxies to the configured backend's real notifications feed
 * (NEXT_PUBLIC_API_URL or legacy aliases). Falls back to local mock
 * notification data only when no backend is configured, so local dev/CI
 * keeps working without a running API server.
 */
export async function GET() {
	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const upstream = await fetch(`${backendUrl}/notifications`, {
				headers: backendHeaders(),
				cache: "no-store",
			});
			const data = await upstream.json().catch(() => null);

			if (!upstream.ok || data === null) {
				return NextResponse.json(
					{ error: "Unable to load notifications from the backend" },
					{ status: upstream.status || 502 },
				);
			}

			return NextResponse.json(data);
		} catch {
			return NextResponse.json(
				{ error: "Unable to reach the notifications backend" },
				{ status: 502 },
			);
		}
	}

	// --- Mock fallback (local dev / CI only, never in production) ---
	if (!canUseMockFallback()) return NO_BACKEND_RESPONSE;
	return NextResponse.json(getNotifications());
}

/**
 * PATCH /api/notifications
 *
 * Marks one notification (`{ id }`) or every notification (`{ markAll: true }`)
 * as read. Proxies the mark-read call to the backend when configured;
 * otherwise persists to the local mock store for local dev/CI.
 */
export async function PATCH(request: Request) {
	const body = (await request.json().catch(() => null)) as {
		id?: string;
		markAll?: boolean;
	} | null;

	if (!body?.id && !body?.markAll) {
		return NextResponse.json(
			{ error: "Notification id or markAll is required" },
			{ status: 400 },
		);
	}

	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const upstream = await fetch(`${backendUrl}/notifications/read`, {
				method: "PATCH",
				headers: backendHeaders(),
				body: JSON.stringify(body),
			});
			const data = await upstream.json().catch(() => null);

			if (!upstream.ok || data === null) {
				return NextResponse.json(
					{ error: "Unable to update notifications on the backend" },
					{ status: upstream.status || 502 },
				);
			}

			return NextResponse.json(data);
		} catch {
			return NextResponse.json(
				{ error: "Unable to reach the notifications backend" },
				{ status: 502 },
			);
		}
	}

	// --- Mock fallback (local dev / CI only, never in production) ---
	if (!canUseMockFallback()) return NO_BACKEND_RESPONSE;

	if (body.markAll) {
		return NextResponse.json(markAllNotificationsRead());
	}

	const updated = markNotificationRead(body.id as string);
	if (!updated) {
		return NextResponse.json(
			{ error: "Notification not found" },
			{ status: 404 },
		);
	}

	return NextResponse.json(updated);
}
