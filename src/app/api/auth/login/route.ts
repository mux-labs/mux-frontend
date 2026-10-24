import { NextResponse } from "next/server";
import { z } from "zod";

const SESSION_COOKIE = "mux_session";

/**
 * Fallback session lifetime (in seconds) used when the upstream auth service
 * does not return a usable `expiresIn`/`expires_in` value. Bounding the cookie
 * keeps its validity aligned with the token instead of creating an unbounded
 * session cookie that outlives the backend token.
 */
export const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60;

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

type AuthResult = { token: string; maxAge: number };

function parseMaxAge(payload: Record<string, unknown>): number {
	const raw = payload.expiresIn ?? payload.expires_in;
	const value = typeof raw === "string" ? Number(raw) : raw;
	if (typeof value === "number" && Number.isFinite(value) && value > 0) {
		return Math.floor(value);
	}
	return DEFAULT_SESSION_MAX_AGE_SECONDS;
}

async function authenticate(
	email: string,
	password: string,
): Promise<AuthResult | null> {
	const authUrl = process.env.MUX_AUTH_URL;
	if (!authUrl) {
		return null;
	}

	const upstream = await fetch(authUrl, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ email, password }),
	});

	if (!upstream.ok) {
		return null;
	}

	const payload = (await upstream.json()) as Record<string, unknown>;
	const token = payload.token;
	if (typeof token !== "string" || token.length === 0) {
		return null;
	}

	return { token, maxAge: parseMaxAge(payload) };
}

export function redactEmail(email: string): string {
	const at = email.indexOf("@");
	if (at <= 0 || at === email.length - 1) {
		return "[redacted]";
	}
	const local = email.slice(0, at);
	return `${local[0]}***@[redacted-domain]`;
}

export async function POST(request: Request): Promise<NextResponse> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ error: { code: "AUTH_LOGIN_INVALID_BODY" } },
			{ status: 400 },
		);
	}

	const parsed = loginSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: { code: "AUTH_LOGIN_INVALID_BODY" } },
			{ status: 400 },
		);
	}

	const { email, password } = parsed.data;

	let result: AuthResult | null;
	try {
		result = await authenticate(email, password);
	} catch {
		console.info(`login failed for ${redactEmail(email)}`);
		return NextResponse.json(
			{ error: { code: "AUTH_LOGIN_UPSTREAM_UNAVAILABLE" } },
			{ status: 503 },
		);
	}

	if (!result) {
		console.info(`login failed for ${redactEmail(email)}`);
		return NextResponse.json(
			{ error: { code: "AUTH_LOGIN_UPSTREAM_UNAVAILABLE" } },
			{ status: 503 },
		);
	}

	console.info(`login succeeded for ${redactEmail(email)}`);
	const response = NextResponse.json({ ok: true });
	response.cookies.set(SESSION_COOKIE, result.token, {
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		path: "/",
		maxAge: result.maxAge,
	});
	return response;
}
