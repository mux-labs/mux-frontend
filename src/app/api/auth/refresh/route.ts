import { NextResponse } from "next/server";
import { isMockFallbackAllowed } from "@/lib/api/config";

const VALID_REFRESH_TOKEN = "mock-refresh-token";

/**
 * POST /api/auth/refresh
 *
 * Mock-only session refresh endpoint used by local dev / CI / demo routes.
 * There is no real backend proxy branch here (yet — refresh isn't wired to
 * mux-backend), so unlike the other routes this always used to accept the
 * hardcoded mock refresh token. That's disabled in production builds via
 * `isMockFallbackAllowed()` so a production deployment can't silently mint
 * a valid session from a hardcoded token.
 */
export async function POST(request: Request) {
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

	const body = await request.json().catch(() => ({}));
	if (body.refreshToken !== VALID_REFRESH_TOKEN) {
		return NextResponse.json({ error: "invalid_refresh" }, { status: 401 });
	}

	return NextResponse.json({
		accessToken: "mock-access-token",
		refreshToken: VALID_REFRESH_TOKEN,
		expiresIn: 30,
	});
}
