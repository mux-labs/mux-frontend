import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/config";
import { SESSION_TOKEN_COOKIE } from "@/lib/auth/routeAccess";

/**
 * POST /api/auth/logout
 *
 * Clears the HttpOnly `mux_auth_token` session cookie (#621). Client JS
 * cannot delete an HttpOnly cookie itself, so `AuthContext.signOut()` calls
 * this route. Best-effort notifies the backend so it can revoke the session
 * server-side too.
 */
export async function POST(request: Request) {
	const backendUrl = getApiBaseUrl();
	const token = request.headers
		.get("cookie")
		?.match(new RegExp(`${SESSION_TOKEN_COOKIE}=([^;]+)`))?.[1];

	if (backendUrl && token) {
		try {
			await fetch(`${backendUrl}/auth/logout`, {
				method: "POST",
				headers: {
					authorization: `Bearer ${token}`,
					cookie: `${SESSION_TOKEN_COOKIE}=${token}`,
				},
			});
		} catch {
			// Revoking server-side is best-effort; the cookie is cleared regardless.
		}
	}

	const response = NextResponse.json({ ok: true });
	response.cookies.set(SESSION_TOKEN_COOKIE, "", {
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		secure: process.env.NODE_ENV === "production",
		maxAge: 0,
	});
	return response;
}
