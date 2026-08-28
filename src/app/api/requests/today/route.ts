import { NextResponse } from "next/server";
import { getApiBaseUrl, getApiKey } from "@/lib/api/config";
import { mockOverview } from "@/mock-data/overview";

/**
 * GET /api/requests/today
 *
 * Proxies today's API request count to the configured backend
 * (NEXT_PUBLIC_API_URL or legacy aliases). If no backend URL is set, falls
 * back to mock data so local development / demo works without a running API.
 */
export async function GET(request: Request) {
	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const apiKey = getApiKey();
			const upstream = await fetch(`${backendUrl}/requests/today`, {
				headers: {
					"content-type": "application/json",
					...(apiKey ? { "x-api-key": apiKey } : {}),
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
				{ error: "Unable to reach telemetry service" },
				{ status: 502 },
			);
		}
	}

	// --- Mock fallback (no NEXT_PUBLIC_API_URL set) ---
	return NextResponse.json({ count: mockOverview.apiRequestsToday });
}
