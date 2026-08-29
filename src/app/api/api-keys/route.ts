import { NextResponse } from "next/server";
import {
	getApiBaseUrl,
	getUpstreamAuthHeaders,
	isMockFallbackAllowed,
} from "@/lib/api/config";
import { createApiKey, getApiKeys, revokeApiKey } from "@/mock-data/api-keys";

function backendHeaders(): Record<string, string> {
	return {
		"content-type": "application/json",
		...getUpstreamAuthHeaders(),
	};
}

function backendUnavailableResponse() {
	return NextResponse.json(
		{
			error: "backend_unavailable",
			message:
				"No API keys backend is configured for this production deployment. Set NEXT_PUBLIC_API_URL.",
		},
		{ status: 503 },
	);
}

/**
 * GET /api/api-keys
 *
 * Proxies to the configured backend's real API key store
 * (NEXT_PUBLIC_API_URL or legacy aliases). Falls back to the local mock
 * store (previously localStorage-backed) only when no backend is
 * configured, so local dev/CI keeps working without a running API server —
 * and only outside production, mirroring `/api/wallets` (see
 * `isMockFallbackAllowed()`). A production deployment with no backend
 * configured must never silently list, create, or revoke against the mock
 * store.
 */
export async function GET() {
	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const upstream = await fetch(`${backendUrl}/api-keys`, {
				headers: backendHeaders(),
				cache: "no-store",
			});
			const data = await upstream.json().catch(() => null);

			if (!upstream.ok || data === null) {
				return NextResponse.json(
					{ error: "Unable to load API keys from the backend" },
					{ status: upstream.status || 502 },
				);
			}

			return NextResponse.json({ data });
		} catch {
			return NextResponse.json(
				{ error: "Unable to reach the API keys backend" },
				{ status: 502 },
			);
		}
	}

	if (!isMockFallbackAllowed()) {
		return backendUnavailableResponse();
	}

	// --- Mock fallback (no NEXT_PUBLIC_API_URL set, non-production only) ---
	return NextResponse.json({ data: getApiKeys() });
}

export async function POST(request: Request) {
	const body = (await request.json().catch(() => null)) as {
		name?: string;
	} | null;
	const name = body?.name?.trim();

	if (!name) {
		return NextResponse.json(
			{ error: "API key name is required" },
			{ status: 400 },
		);
	}

	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const upstream = await fetch(`${backendUrl}/api-keys`, {
				method: "POST",
				headers: backendHeaders(),
				body: JSON.stringify({ name }),
			});
			const data = await upstream.json().catch(() => null);

			if (!upstream.ok || data === null) {
				return NextResponse.json(
					{ error: "Unable to create API key on the backend" },
					{ status: upstream.status || 502 },
				);
			}

			return NextResponse.json({ data }, { status: 201 });
		} catch {
			return NextResponse.json(
				{ error: "Unable to reach the API keys backend" },
				{ status: 502 },
			);
		}
	}

	if (!isMockFallbackAllowed()) {
		return backendUnavailableResponse();
	}

	// --- Mock fallback (no NEXT_PUBLIC_API_URL set, non-production only) ---
	return NextResponse.json({ data: createApiKey(name) }, { status: 201 });
}

export async function PATCH(request: Request) {
	const body = (await request.json().catch(() => null)) as {
		id?: string;
		action?: string;
	} | null;

	if (!body?.id || body.action !== "revoke") {
		return NextResponse.json(
			{ error: "API key id and revoke action are required" },
			{ status: 400 },
		);
	}

	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const upstream = await fetch(`${backendUrl}/api-keys`, {
				method: "PATCH",
				headers: backendHeaders(),
				body: JSON.stringify(body),
			});
			const data = await upstream.json().catch(() => null);

			if (upstream.status === 404) {
				return NextResponse.json(
					{ error: "API key not found" },
					{ status: 404 },
				);
			}

			if (!upstream.ok || data === null) {
				return NextResponse.json(
					{ error: "Unable to revoke API key on the backend" },
					{ status: upstream.status || 502 },
				);
			}

			return NextResponse.json({ data });
		} catch {
			return NextResponse.json(
				{ error: "Unable to reach the API keys backend" },
				{ status: 502 },
			);
		}
	}

	if (!isMockFallbackAllowed()) {
		return backendUnavailableResponse();
	}

	// --- Mock fallback (no NEXT_PUBLIC_API_URL set, non-production only) ---
	const revoked = revokeApiKey(body.id);
	if (!revoked) {
		return NextResponse.json({ error: "API key not found" }, { status: 404 });
	}

	return NextResponse.json({ data: revoked });
}
