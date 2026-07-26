import { NextResponse } from "next/server";

/**
 * POST /api/auth/login
 *
 * Proxies login credentials to the configured backend API
 * (NEXT_PUBLIC_API_URL). If no backend URL is set, falls back to a mock
 * response so local development works without a running API server.
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

	const backendUrl = process.env.NEXT_PUBLIC_API_URL;

	if (backendUrl) {
		// Proxy to the real backend
		try {
			const upstream = await fetch(`${backendUrl}/auth/login`, {
				method: "POST",
				headers: { "content-type": "application/json" },
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

	// --- Mock fallback (no NEXT_PUBLIC_API_URL set) ---
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
