import { NextResponse } from "next/server";
import {
	getBackendApiBaseUrl,
	getUpstreamAuthHeaders,
	isMockFallbackAllowed,
} from "@/lib/api/config";

/**
 * Shape of the settings payload exchanged with the backend and the client.
 * Keep in sync with mux-backend `PATCH /developers/me/settings`.
 */
export interface SettingsPayload {
	displayName: string;
	emailUpdates: boolean;
	compactWallets: boolean;
}

function backendUnavailableResponse() {
	return NextResponse.json(
		{
			error: "backend_unavailable",
			message:
				"No settings backend is configured for this production deployment. Set MUX_BACKEND_URL.",
		},
		{ status: 503 },
	);
}

function forwardHeaders(request: Request): Record<string, string> {
	const headers: Record<string, string> = {
		"content-type": "application/json",
		...getUpstreamAuthHeaders(),
	};
	const auth = request.headers.get("authorization");
	if (auth) headers.authorization = auth;
	return headers;
}

/**
 * GET /api/settings
 *
 * Proxies to `{MUX_BACKEND_URL}/developers/me/settings` when configured.
 * In non-production with no backend, returns a 200 with empty/default
 * settings so the UI renders without error. Production with no backend
 * returns 503.
 */
export async function GET(request: Request) {
	const authorization = request.headers.get("authorization");
	if (!authorization?.startsWith("Bearer ")) {
		return NextResponse.json({ error: "missing_auth" }, { status: 401 });
	}

	const backendUrl = getBackendApiBaseUrl();

	if (backendUrl) {
		try {
			const upstream = await fetch(
				`${backendUrl}/developers/me/settings`,
				{
					headers: forwardHeaders(request),
					cache: "no-store",
				},
			);
			const data = await upstream.json().catch(() => ({}));
			return NextResponse.json(data, { status: upstream.status });
		} catch {
			return NextResponse.json(
				{ error: "Unable to reach settings backend" },
				{ status: 502 },
			);
		}
	}

	if (!isMockFallbackAllowed()) {
		return backendUnavailableResponse();
	}

	// Non-production mock fallback — return empty settings (the UI will merge
	// these with the user object from the auth context).
	return NextResponse.json(
		{ settings: { displayName: "", emailUpdates: true, compactWallets: false } },
		{ status: 200 },
	);
}

/**
 * PATCH /api/settings
 *
 * Proxies to `{MUX_BACKEND_URL}/developers/me/settings` when configured.
 * In non-production with no backend, echoes the payload back as a mock save.
 * Production with no backend returns 503.
 */
export async function PATCH(request: Request) {
	const authorization = request.headers.get("authorization");
	if (!authorization?.startsWith("Bearer ")) {
		return NextResponse.json({ error: "missing_auth" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	if (
		!body ||
		typeof body !== "object" ||
		typeof (body as Record<string, unknown>).displayName !== "string" ||
		typeof (body as Record<string, unknown>).emailUpdates !== "boolean" ||
		typeof (body as Record<string, unknown>).compactWallets !== "boolean"
	) {
		return NextResponse.json(
			{
				error:
					"Missing required fields: displayName (string), emailUpdates (boolean), compactWallets (boolean)",
			},
			{ status: 400 },
		);
	}

	const payload = body as SettingsPayload;

	if (!payload.displayName.trim()) {
		return NextResponse.json(
			{ error: "displayName must not be empty" },
			{ status: 400 },
		);
	}

	const backendUrl = getBackendApiBaseUrl();

	if (backendUrl) {
		try {
			const upstream = await fetch(
				`${backendUrl}/developers/me/settings`,
				{
					method: "PATCH",
					headers: forwardHeaders(request),
					body: JSON.stringify({
						...payload,
						displayName: payload.displayName.trim(),
					}),
				},
			);
			const data = await upstream.json().catch(() => ({}));
			return NextResponse.json(data, { status: upstream.status });
		} catch {
			return NextResponse.json(
				{ error: "Unable to reach settings backend" },
				{ status: 502 },
			);
		}
	}

	if (!isMockFallbackAllowed()) {
		return backendUnavailableResponse();
	}

	// Non-production mock fallback — echo back the saved settings.
	return NextResponse.json(
		{
			settings: {
				...payload,
				displayName: payload.displayName.trim(),
			},
		},
		{ status: 200 },
	);
}
