import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/config";
import {
	evaluateAccess,
	LOGIN_PATH,
	SESSION_MARKER_COOKIE,
	SESSION_TOKEN_COOKIE,
	verifySessionToken,
} from "@/lib/auth/routeAccess";

/**
 * Server-side route protection for protected prefixes (`/dashboard` and its
 * `/demo/dashboard` mirror).
 *
 * Auth model (#621): provider-agnostic, server-verified sessions.
 *
 *  - With a backend configured (`NEXT_PUBLIC_API_URL` / aliases): a protected
 *    route requires the HttpOnly `mux_auth_token` cookie (set by
 *    `/api/auth/login` from the backend's login response) AND a live
 *    `GET {backend}/auth/session` check confirming it is still valid. The
 *    client-set `mux_auth_session` marker cookie is NOT trusted on its own.
 *  - Without a backend (local dev / CI against in-repo mocks): the marker
 *    cookie is accepted so `pnpm dev` works without a live auth server.
 *
 * See docs/auth-local-setup.md for the full auth flow documentation.
 *
 * `/demo/dashboard` is the relocated dashboard shell. It renders the same
 * full UI as `/dashboard` (sidebar, wallet tables, analytics) sourced from
 * local mock data, so it must sit behind the same auth gate — otherwise the
 * developer console is publicly reachable with mock wallets and fake
 * analytics in production builds. Keep this list in sync with
 * `PROTECTED_PREFIXES` in `src/lib/auth/routeAccess.ts` and `config.matcher`
 * below.
 */
export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	const decision = await evaluateAccess({
		pathname,
		token: request.cookies.get(SESSION_TOKEN_COOKIE)?.value,
		marker: request.cookies.get(SESSION_MARKER_COOKIE)?.value,
		backendUrl: getApiBaseUrl(),
		verifyToken: verifySessionToken,
	});

	if (decision.allow) {
		return NextResponse.next();
	}

	const loginUrl = request.nextUrl.clone();
	loginUrl.pathname = LOGIN_PATH;
	loginUrl.searchParams.set("callbackUrl", pathname);
	const redirect = NextResponse.redirect(loginUrl);

	// A rejected token is stale/forged — clear both cookies so the browser
	// stops replaying it on every request.
	if (decision.reason === "invalid-token") {
		redirect.cookies.delete(SESSION_TOKEN_COOKIE);
		redirect.cookies.delete(SESSION_MARKER_COOKIE);
	}

	return redirect;
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
