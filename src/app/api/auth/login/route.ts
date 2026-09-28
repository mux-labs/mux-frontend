import { NextResponse } from "next/server";

// POST /api/auth/login
// Invariant: request bodies, passwords, tokens, and cookies are NEVER logged.
// Only the correlation id, stable error code, and redacted identifiers are.

const ERROR_CODES = {
	INVALID_BODY: "AUTH_LOGIN_INVALID_BODY",
	INVALID_CREDENTIALS: "AUTH_LOGIN_INVALID_CREDENTIALS",
	UPSTREAM_UNAVAILABLE: "AUTH_LOGIN_UPSTREAM_UNAVAILABLE",
} as const;

const MAX_FIELD_LENGTH = 256;
const SESSION_COOKIE = "mux_session";

type LoginBody = { email: string; password: string };

function newCorrelationId(): string {
	return `login_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// Emails are partially masked; secrets are replaced entirely.
export function redactEmail(email: string): string {
	const [user, domain] = email.split("@");
	if (!user || !domain) return "[redacted]";
	return `${user[0]}***@${domain}`;
}

function log(event: string, fields: Record<string, string | number>) {
	console.info(JSON.stringify({ event, ...fields }));
}

function errorResponse(status: number, code: string, message: string, correlationId: string) {
	return NextResponse.json({ error: { code, message, correlationId } }, { status });
}

function parseBody(raw: unknown): LoginBody | null {
	if (!raw || typeof raw !== "object") return null;
	const { email, password } = raw as Record<string, unknown>;
	if (typeof email !== "string" || typeof password !== "string") return null;
	if (!email.includes("@") || password.length === 0) return null;
	if (email.length > MAX_FIELD_LENGTH || password.length > MAX_FIELD_LENGTH) return null;
	return { email: email.trim().toLowerCase(), password };
}

async function authenticate(body: LoginBody): Promise<string | null> {
	const upstream = process.env.MUX_AUTH_URL;
	if (!upstream) throw new Error("auth upstream not configured");
	const res = await fetch(`${upstream}/login`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	if (res.status === 401 || res.status === 403) return null;
	if (!res.ok) throw new Error(`auth upstream status ${res.status}`);
	const data = (await res.json()) as { token?: unknown };
	return typeof data.token === "string" ? data.token : null;
}

export async function POST(request: Request) {
	const correlationId = newCorrelationId();

	let body: LoginBody | null = null;
	try {
		body = parseBody(await request.json());
	} catch {
		body = null;
	}
	if (!body) {
		log("auth.login.rejected", { correlationId, code: ERROR_CODES.INVALID_BODY });
		return errorResponse(400, ERROR_CODES.INVALID_BODY, "Email and password are required.", correlationId);
	}

	let token: string | null;
	try {
		token = await authenticate(body);
	} catch {
		// Fail closed: never fall back to a session when the upstream is down.
		log("auth.login.upstream_error", { correlationId, code: ERROR_CODES.UPSTREAM_UNAVAILABLE });
		return errorResponse(503, ERROR_CODES.UPSTREAM_UNAVAILABLE, "Sign-in is temporarily unavailable.", correlationId);
	}

	if (!token) {
		log("auth.login.failed", {
			correlationId,
			code: ERROR_CODES.INVALID_CREDENTIALS,
			email: redactEmail(body.email),
		});
		return errorResponse(401, ERROR_CODES.INVALID_CREDENTIALS, "Invalid email or password.", correlationId);
	}

	log("auth.login.succeeded", { correlationId, email: redactEmail(body.email) });
	const response = NextResponse.json({ ok: true, correlationId });
	response.cookies.set(SESSION_COOKIE, token, {
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		path: "/",
	});
	return response;
}
