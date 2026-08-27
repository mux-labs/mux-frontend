import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Protected route prefixes.
 * Any request whose pathname starts with one of these values requires
 * the user to be authenticated (indicated by the presence of the
 * `mux_auth_session` cookie set during sign-in).
 *
 * CSRF / Cookie Security:
 *   The `mux_auth_session` cookie is set with `SameSite=Lax` so the
 *   browser will not attach it to cross-site sub-requests (POST from
 *   an external origin).  Combined with the path-only check below,
 *   this provides a strong CSRF defence while still allowing top-level
 *   navigations (e.g. a bookmarked dashboard link) to pass through.
 *
 *   In production this cookie should also carry the `Secure` flag
 *   (set via a server-side `Set-Cookie` header in the login route).
 *
 * See docs/auth-local-setup.md for the full auth flow documentation.
 *
 * `/demo/dashboard` is the relocated dashboard shell. It renders the same
 * full UI as `/dashboard` (sidebar, wallet tables, analytics) sourced from
 * local mock data, so it must sit behind the same auth gate — otherwise the
 * developer console is publicly reachable with mock wallets and fake
 * analytics in production builds.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/demo/dashboard"];

/**
 * The path users are redirected to when they are not authenticated.
 * A `callbackUrl` query param is appended so the login page can
 * redirect back after a successful sign-in.
 */
const LOGIN_PATH = "/login";

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	const isProtected = PROTECTED_PREFIXES.some((prefix) =>
		pathname.startsWith(prefix),
	);

	if (!isProtected) {
		return NextResponse.next();
	}

	const session = request.cookies.get("mux_auth_session");

	if (!session?.value) {
		const loginUrl = request.nextUrl.clone();
		loginUrl.pathname = LOGIN_PATH;
		loginUrl.searchParams.set("callbackUrl", pathname);
		return NextResponse.redirect(loginUrl);
	}

	return NextResponse.next();
}

export const config = {
	/*
	 * Match all routes under /dashboard and its /demo/dashboard mirror.
	 * Exclude Next.js internals and static assets.
	 */
	matcher: [
		"/dashboard",
		"/dashboard/:path*",
		"/demo/dashboard",
		"/demo/dashboard/:path*",
	],
};
