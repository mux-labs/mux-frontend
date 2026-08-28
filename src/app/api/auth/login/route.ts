import { NextResponse } from "next/server";
import { getApiBaseUrl, getUpstreamAuthHeaders } from "@/lib/api/config";

/**
 * POST /api/auth/login
 *
 * Proxies login credentials to the configured backend API
 * (NEXT_PUBLIC_API_URL or legacy aliases). If no backend URL is set, falls back to a mock
 * response so local development works without a running API server.
 *
 * The mock fallback is disabled in production builds (`NODE_ENV=production`)
 * — see `isMockFallbackAllowed()` — so a misconfigured deployment fails
 * loudly instead of accepting any credentials.
 */
export async function POST(request: Request) {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ error: "Invalid request body" },
			{ status: 400 },
		);
	}

	const { email, password } = body as { email?: string; password?: string };
	if (!email || !password) {
		return NextResponse.json(
			{ error: "Email and password are required" },
			{ status: 400 },
		);
	}

	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		// Proxy to the real backend
		try {
			const upstream = await fetch(`${backendUrl}/auth/login`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					...getUpstreamAuthHeaders(),
				},
				body: JSON.stringify({ email, password }),
			});

			const data = await upstream.json().catch(() => ({}));

			if (!upstream.ok) {
				return NextResponse.json(data, { status: upstream.status });
			}

			return NextResponse.json(data, { status: 200 });
		} catch {
			return NextResponse.json(
				{ error: "Unable to reach authentication server" },
				{ status: 502 },
			);
		}
	}

	if (!isMockFallbackAllowed()) {
		return NextResponse.json(
			{
				error: "backend_unavailable",
				message:
					"No auth backend is configured for this production deployment. Set NEXT_PUBLIC_API_URL.",
			},
			{ status: 503 },
		);
	}

	// --- Mock fallback (no NEXT_PUBLIC_API_URL set, non-production only) ---
	// Accepts any well-formed credentials; used for local dev / CI.
	const namePart = email.split("@")[0] ?? "User";
	const name = namePart
		.split(/[._-]/)
		.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
		.join(" ");

	return NextResponse.json(
		{ user: { name, email, role: "developer" } },
		{ status: 200 },
	);
}
