import { NextResponse } from "next/server";
import {
	getApiBaseUrl,
	getUpstreamAuthHeaders,
	isMockFallbackAllowed,
} from "@/lib/api/config";
import { getApiKeyUsage } from "@/mock-data/api-key-usage";

/** 503 returned instead of mock data when no backend is configured in production. */
function backendUnavailableResponse() {
	return NextResponse.json(
		{
			error: "backend_unavailable",
			message:
				"No API key usage backend is configured for this production deployment. Set NEXT_PUBLIC_API_URL.",
		},
		{ status: 503 },
	);
}

type RouteContext = {
	params:
		| {
				id: string;
		  }
		| Promise<{
				id: string;
		  }>;
};

function backendHeaders(): Record<string, string> {
	return {
		"content-type": "application/json",
		...getUpstreamAuthHeaders(),
	};
}

/**
 * GET /api/api-keys/[id]/usage
 *
 * Per-key usage analytics (roadmap item: "Per-key usage analytics").
 * Proxies to the configured backend's real usage metrics
 * (NEXT_PUBLIC_API_URL or legacy aliases). Falls back to the local mock
 * generator only outside production and only when no backend is configured,
 * so local dev/CI keeps working without a running API server — mirrors the
 * production-safety rule used by `/api/api-keys` and `/api/wallets/[id]`.
 */
export async function GET(request: Request, { params }: RouteContext) {
	const { id } = await params;
	const apiKeyId = id.trim();

	if (!apiKeyId) {
		return NextResponse.json({ error: "invalid_id" }, { status: 400 });
	}

	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const upstream = await fetch(
				`${backendUrl}/api-keys/${encodeURIComponent(apiKeyId)}/usage`,
				{
					headers: backendHeaders(),
					cache: "no-store",
				},
			);
			const data = await upstream.json().catch(() => null);

			if (!upstream.ok || data === null) {
				return NextResponse.json(
					{ error: "Unable to load API key usage from the backend" },
					{ status: upstream.status || 502 },
				);
			}

			return NextResponse.json({ data });
		} catch {
			return NextResponse.json(
				{ error: "Unable to reach the API key usage backend" },
				{ status: 502 },
			);
		}
	}

	if (!isMockFallbackAllowed()) {
		return backendUnavailableResponse();
	}

	// --- Mock fallback (no NEXT_PUBLIC_API_URL set, non-production only) ---
	return NextResponse.json({ data: getApiKeyUsage(apiKeyId) });
}
