import { NextResponse } from "next/server";

/** Cookie name — must match `SESSION_COOKIE_NAME` in AuthContext / middleware. */
const SESSION_COOKIE_NAME = "mux_auth_session";

/**
 * POST /api/auth/logout
 *
 * Clears the `HttpOnly` session cookie server-side (issue #622). The client
 * cannot delete an `HttpOnly` cookie itself, so `AuthContext.signOut` calls
 * this endpoint. Always succeeds — logging out is not allowed to fail.
 */
export async function POST() {
	const response = NextResponse.json({ ok: true }, { status: 200 });
	response.cookies.set({
		name: SESSION_COOKIE_NAME,
		value: "",
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: 0,
	});
	return response;
}
