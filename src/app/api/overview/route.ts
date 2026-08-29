import { NextResponse } from "next/server";
import {
	getApiBaseUrl,
	getUpstreamAuthHeaders,
	isMockFallbackAllowed,
} from "@/lib/api/config";
import { mockOverview } from "@/mock-data/overview";

/**
 * GET /api/overview
 *
 * Proxies dashboard overview stats to the configured backend
 * (NEXT_PUBLIC_API_URL or legacy aliases). If no backend URL is set, falls
 * back to mock data so local development / demo works without a running API
 * — but only outside production. A production build with no backend
 * configured returns `503` instead of fabricated stats, mirroring
 * `/api/wallets` and `/api/activity` (see `isMockFallbackAllowed()`).
 */
export async function GET(request: Request) {
	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const upstream = await fetch(`${backendUrl}/overview`, {
				headers: {
					"content-type": "application/json",
					...getUpstreamAuthHeaders(),
					...(request.headers.get("authorization")
						? { authorization: request.headers.get("authorization") as string }
						: {}),
				},
				cache: "no-store",
			});

			const data = await upstream.json().catch(() => ({}));

			if (!upstream.ok) {
				return NextResponse.json(data, { status: upstream.status });
			}

			return NextResponse.json(data, { status: 200 });
		} catch {
			return NextResponse.json(
				{ error: "Unable to reach overview service" },
				{ status: 502 },
			);
		}
	}

	if (!isMockFallbackAllowed()) {
		return NextResponse.json(
			{
				error: "backend_unavailable",
				message:
					"No overview backend is configured for this production deployment. Set NEXT_PUBLIC_API_URL.",
			},
			{ status: 503 },
		);
	}

	// --- Mock fallback (no NEXT_PUBLIC_API_URL set, non-production only) ---
	return NextResponse.json({ data: mockOverview });
}
