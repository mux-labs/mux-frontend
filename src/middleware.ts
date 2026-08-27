import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/sessionToken";

/**
 * Protected route prefixes. A request whose pathname starts with one of
 * these requires a valid session token.
 *
 * Session validation (issue #622):
 *   The `mux_auth_session` cookie must be a valid HS256 JWT — signature
 *   checked against `SESSION_JWT_SECRET`, and `exp` in the future. Mere
 *   cookie presence is NOT sufficient.
 *
 *   The token is issued server-side by `POST /api/auth/login` (which signs
 *   it locally in mock mode, or passes the `mux-backend` token through) and
 *   set as an `HttpOnly` cookie. The client never mints or reads it.
 *
 *   Fail-closed: if `SESSION_JWT_SECRET` is unset in a production build,
 *   every protected request is redirected to login. Outside production the
 *   middleware falls back to a presence check so `pnpm dev` / CI / the demo
 *   tree keep working without configuring a secret.
 *
 * The parallel `/demo/dashboard/*` tree is intentionally NOT protected.
 *
 * See docs/auth-local-setup.md for the full auth flow documentation.
 */
const PROTECTED_PREFIXES = ["/dashboard"];

/** Path unauthenticated users are redirected to. */
const LOGIN_PATH = "/login";

/** Cookie name — must match `SESSION_COOKIE_NAME` in AuthContext. */
const SESSION_COOKIE_NAME = "mux_auth_session";

function redirectToLogin(request: NextRequest) {
	const loginUrl = request.nextUrl.clone();
	loginUrl.pathname = LOGIN_PATH;
	loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
	return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	const isProtected = PROTECTED_PREFIXES.some((prefix) =>
		pathname.startsWith(prefix),
	);
	if (!isProtected) {
		return NextResponse.next();
	}

	const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
	const secret = process.env.SESSION_JWT_SECRET;

	if (secret) {
		const claims = await verifySessionToken(token, secret);
		if (!claims) {
			return redirectToLogin(request);
		}
		return NextResponse.next();
	}

	// No secret configured.
	if (process.env.NODE_ENV === "production") {
		// Fail closed — never trust an unverifiable cookie in production.
		console.error(
			"[middleware] SESSION_JWT_SECRET is not set; refusing all protected traffic.",
		);
		return redirectToLogin(request);
	}

	// Non-production: legacy presence check for local dev / CI / demo.
	if (!token) {
		return redirectToLogin(request);
	}
	return NextResponse.next();
}

export const config = {
	/*
	 * Match all routes under /dashboard.
	 * Exclude Next.js internals and static assets.
	 */
	matcher: ["/dashboard", "/dashboard/:path*"],
};
