import { NextResponse } from "next/server";
import {
	getApiBaseUrl,
	getUpstreamAuthHeaders,
	isMockFallbackAllowed,
} from "@/lib/api/config";
import { SESSION_TOKEN_COOKIE } from "@/lib/auth/routeAccess";

const VALID_REFRESH_TOKEN = "mock-refresh-token";

/**
 * POST /api/auth/refresh
 *
 * Production vs demo/mock split is explicit:
 *
 *  - A backend is configured (`NEXT_PUBLIC_API_URL` / legacy aliases): the
 *    request is proxied to `{backend}/auth/refresh`, forwarding the caller's
 *    `Authorization` header and session cookie. A rotated opaque token in the
 *    response refreshes the HttpOnly `mux_auth_token` cookie (#626/#627).
 *  - No backend + non-production build: mints a mock access token for the
 *    hardcoded mock refresh token so `pnpm dev` / CI / `/demo` keep working.
 *  - No backend + production build: refuses with `503 backend_unavailable`,
 *    so a deployment can't mint a real-looking session from a hardcoded
 *    token.
 */

/** Pull the rotated session token out of a backend refresh response. */
function extractSessionToken(
	data: Record<string, unknown>,
): string | undefined {
	for (const key of ["token", "accessToken", "sessionToken"]) {
		const value = data[key];
		if (typeof value === "string" && value.length > 0) return value;
	}
	return undefined;
}

export async function POST(request: Request) {
	const body = (await request.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;

	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		// --- Real backend proxy ---
		const authorization = request.headers.get("authorization");
		const cookie = request.headers.get("cookie");
		try {
			const upstream = await fetch(`${backendUrl}/auth/refresh`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					...getUpstreamAuthHeaders(),
					...(authorization ? { authorization } : {}),
					...(cookie ? { cookie } : {}),
				},
				body: JSON.stringify(body ?? {}),
			});

			const data = await upstream.json().catch(() => ({}));

			if (!upstream.ok) {
				return NextResponse.json(data, { status: upstream.status });
			}

			const response = NextResponse.json(data, { status: 200 });
			const token = extractSessionToken(data);
			if (token) {
				response.cookies.set(SESSION_TOKEN_COOKIE, token, {
					httpOnly: true,
					secure: process.env.NODE_ENV === "production",
					sameSite: "lax",
					path: "/",
				});
			}
			return response;
		} catch {
			return NextResponse.json(
				{ error: "Unable to reach authentication server" },
				{ status: 502 },
			);
		}
	}

	// --- No backend configured ---
	if (!isMockFallbackAllowed()) {
		return NextResponse.json(
			{
				error: "backend_unavailable",
				message:
					"No auth backend is configured for this production deployment.",
			},
			{ status: 503 },
		);
	}

	// --- Mock fallback (non-production only) ---
	if (body.refreshToken !== VALID_REFRESH_TOKEN) {
		return NextResponse.json({ error: "invalid_refresh" }, { status: 401 });
	}

	return NextResponse.json({
		accessToken: "mock-access-token",
		refreshToken: VALID_REFRESH_TOKEN,
		expiresIn: 30,
	});
}
