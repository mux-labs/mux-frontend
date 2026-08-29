import { NextResponse } from "next/server";
import { getApiBaseUrl, getUpstreamAuthHeaders } from "@/lib/api/config";
import { mockOverview } from "@/mock-data/overview";

/**
 * GET /api/overview
 *
 * Proxies dashboard overview stats to the configured backend
 * (NEXT_PUBLIC_API_URL or legacy aliases). If no backend URL is set, falls
 * back to mock data so local development / demo works without a running API.
 */
export async function GET(request?: Request) {
	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const authHeader = request?.headers.get("authorization");
			const upstream = await fetch(`${backendUrl}/overview`, {
				headers: {
					"content-type": "application/json",
					...getUpstreamAuthHeaders(),
					...(authHeader ? { authorization: authHeader } : {}),
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

	// --- Mock fallback (no NEXT_PUBLIC_API_URL set) ---
	return NextResponse.json({ data: mockOverview });
}
