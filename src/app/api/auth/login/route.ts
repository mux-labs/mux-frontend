import { NextResponse } from "next/server";
import {
	getApiBaseUrl,
	getUpstreamAuthHeaders,
	isMockFallbackAllowed,
} from "@/lib/api/config";
import { SESSION_TOKEN_COOKIE } from "@/lib/auth/routeAccess";

/**
 * POST /api/auth/login
 *
 * Auth flow (production vs demo/mock split is explicit):
 *
 *  - A backend is configured (`NEXT_PUBLIC_API_URL` / legacy aliases): the
 *    request is proxied to `{backend}/auth/login`. On success the opaque
 *    session token from the backend response is written to the HttpOnly,
 *    `SameSite=Lax`, `Secure` (in production) `mux_auth_token` cookie — see
 *    `setSessionCookie()`. No token ever reaches client JS or `localStorage`.
 *  - No backend + non-production build: a mock user is returned so `pnpm dev`
 *    and CI work without a live API. The response also carries a mock
 *    `session` block the client persists in `sessionStorage` (see
 *    `src/lib/session.js`).
 *  - No backend + production build (`NODE_ENV=production`): the route refuses
 *    with `503 backend_unavailable`. There is deliberately no mock sign-in in
 *    production — otherwise any well-formed email/password would mint a fake
 *    authenticated session (#625).
 */

/** Mock session handed to the client in non-production mock mode (#628). */
const MOCK_SESSION = {
	accessToken: "mock-access-token",
	refreshToken: "mock-refresh-token",
	/** Seconds. */
	expiresIn: 30 * 60,
};

/** Pull an opaque session token out of a backend login response. */
function extractSessionToken(
	data: Record<string, unknown>,
): string | undefined {
	for (const key of ["token", "accessToken", "sessionToken"]) {
		const value = data[key];
		if (typeof value === "string" && value.length > 0) return value;
	}
	return undefined;
}

/**
 * Attach the server-verified session cookie (#627).
 *
 * HttpOnly  — unreadable from JS, so an XSS payload can't exfiltrate it.
 * SameSite=Lax — not sent on cross-site sub-requests (CSRF mitigation) but
 *                kept on top-level navigations so deep links still work.
 * Secure    — TLS-only in production; omitted in dev so `localhost` works.
 * Path=/    — sent for the whole app; no Domain attribute → host-only.
 */
function setSessionCookie(response: NextResponse, token: string): void {
	response.cookies.set(SESSION_TOKEN_COOKIE, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
	});
}

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
		// --- Real backend proxy ---
		try {
			const upstream = await fetch(`${backendUrl}/auth/login`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					...getUpstreamAuthHeaders(),
				},
				body: JSON.stringify({ email, password }),
			});

			const data = (await upstream.json().catch(() => ({}))) as Record<
				string,
				unknown
			>;

			if (!upstream.ok) {
				return NextResponse.json(data, { status: upstream.status });
			}

			// Echo a `session` block so the client can persist the bearer token
			// in sessionStorage (via `src/lib/session.js`) and attach it as the
			// Authorization header on subsequent wallet/API requests (#712).
			// The token is ALSO written to the HttpOnly cookie below — both
			// transports are needed: the cookie for middleware-level route
			// protection, the sessionStorage copy for client-side fetch calls.
			const token = extractSessionToken(data);
			const responsePayload: Record<string, unknown> = { ...data };
			if (token && !responsePayload.session) {
				responsePayload.session = {
					accessToken: token,
					// Carry forward expiresIn from the backend response when present.
					...(typeof data.expiresIn === "number"
						? { expiresIn: data.expiresIn }
						: {}),
				};
			}

			const response = NextResponse.json(responsePayload, { status: 200 });
			if (token) {
				setSessionCookie(response, token);
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
					"No auth backend is configured for this production deployment. " +
					"Set NEXT_PUBLIC_API_URL — mock sign-in is not available in production.",
			},
			{ status: 503 },
		);
	}

	// --- Mock fallback (non-production only): accepts any well-formed creds ---
	const namePart = email.split("@")[0] ?? "User";
	const name = namePart
		.split(/[._-]/)
		.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
		.join(" ");

	const user = { name, email, role: "developer" };
	return NextResponse.json({ user, session: MOCK_SESSION }, { status: 200 });
}
