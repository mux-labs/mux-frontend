import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/config";
import { signSessionToken } from "@/lib/auth/sessionToken";

/** Cookie name — must match `SESSION_COOKIE_NAME` in AuthContext / middleware. */
const SESSION_COOKIE_NAME = "mux_auth_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

interface AuthUserLike {
	name?: string;
	email?: string;
	role?: string;
}

/**
 * Attaches the session cookie to a successful login response (issue #622).
 *
 * When `SESSION_JWT_SECRET` is configured the cookie carries a verifiable
 * HS256 JWT — either the token the backend returned, or one signed locally
 * from the resolved user. The middleware validates its signature + expiry.
 *
 * When no secret is configured (local dev / CI) we fall back to the legacy
 * marker cookie so the presence-check path in middleware keeps working.
 */
async function attachSessionCookie(
	response: NextResponse,
	opts: { backendToken?: unknown; user?: AuthUserLike },
) {
	const secret = process.env.SESSION_JWT_SECRET;
	const isProd = process.env.NODE_ENV === "production";

	let value: string;
	if (secret) {
		value =
			typeof opts.backendToken === "string" && opts.backendToken.length > 0
				? opts.backendToken
				: await signSessionToken(
						{
							sub: opts.user?.email ?? "unknown",
							role: opts.user?.role,
						},
						secret,
						SESSION_TTL_SECONDS,
					);
	} else {
		// Legacy marker cookie (non-production only path in middleware).
		value = "1";
	}

	response.cookies.set({
		name: SESSION_COOKIE_NAME,
		value,
		httpOnly: true,
		sameSite: "lax",
		secure: isProd,
		path: "/",
		maxAge: SESSION_TTL_SECONDS,
	});
}

/**
 * POST /api/auth/login
 *
 * Proxies login credentials to the configured backend API
 * (NEXT_PUBLIC_API_URL or legacy aliases). If no backend URL is set, falls
 * back to a mock response so local development works without a running API
 * server. On success, sets the `mux_auth_session` cookie (see above).
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
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email, password }),
			});

			const data = await upstream.json().catch(() => ({}));

			if (!upstream.ok) {
				return NextResponse.json(data, { status: upstream.status });
			}

			const response = NextResponse.json(data, { status: 200 });
			const record = data as {
				user?: AuthUserLike;
				token?: unknown;
				accessToken?: unknown;
			};
			await attachSessionCookie(response, {
				backendToken: record.token ?? record.accessToken,
				user: record.user,
			});
			return response;
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

	const user = { name, email, role: "developer" };
	const response = NextResponse.json({ user }, { status: 200 });
	await attachSessionCookie(response, { user });
	return response;
}
