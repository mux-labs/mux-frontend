/**
 * Minimal HS256 (HMAC-SHA256) JWT sign/verify built on Web Crypto so it runs
 * in the Edge middleware runtime, Node route handlers, and jsdom tests alike
 * — no `jsonwebtoken` / `jose` dependency.
 *
 * Used by the Next.js middleware (issue #622) to validate the session token
 * server-side: signature + `exp`, not merely cookie presence.
 *
 * The signing secret comes from `SESSION_JWT_SECRET` (server-only env var).
 * There is deliberately no baked-in default — a missing secret makes the
 * middleware fail closed in production (see `src/middleware.ts`).
 */

export interface SessionClaims {
	/** Subject — the user id or email. */
	sub: string;
	/** Role, mirrored from the auth response. */
	role?: string;
	/** Issued-at (seconds since epoch). */
	iat: number;
	/** Expiry (seconds since epoch). */
	exp: number;
	[key: string]: unknown;
}

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function base64UrlEncodeString(value: string): string {
	return base64UrlEncode(encoder.encode(value));
}

function base64UrlDecodeToString(value: string): string {
	const padded = value
		.replace(/-/g, "+")
		.replace(/_/g, "/")
		.padEnd(Math.ceil(value.length / 4) * 4, "=");
	const binary = atob(padded);
	const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let mismatch = 0;
	for (let i = 0; i < a.length; i += 1) {
		mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return mismatch === 0;
}

async function importKey(secret: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

async function sign(data: string, secret: string): Promise<string> {
	const key = await importKey(secret);
	const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
	return base64UrlEncode(new Uint8Array(signature));
}

/**
 * Signs a session JWT. `expiresInSeconds` defaults to 8h to match the
 * client session TTL in `AuthContext`.
 */
export async function signSessionToken(
	payload: { sub: string; role?: string; [key: string]: unknown },
	secret: string,
	expiresInSeconds = 8 * 60 * 60,
): Promise<string> {
	if (!secret) throw new Error("signSessionToken: secret is required");

	const nowSeconds = Math.floor(Date.now() / 1000);
	const header = { alg: "HS256", typ: "JWT" };
	const claims: SessionClaims = {
		...payload,
		iat: nowSeconds,
		exp: nowSeconds + expiresInSeconds,
	};

	const encodedHeader = base64UrlEncodeString(JSON.stringify(header));
	const encodedPayload = base64UrlEncodeString(JSON.stringify(claims));
	const signingInput = `${encodedHeader}.${encodedPayload}`;
	const signature = await sign(signingInput, secret);

	return `${signingInput}.${signature}`;
}

/**
 * Verifies an HS256 session JWT. Returns the claims on success, or `null`
 * for any failure (malformed, wrong algorithm, bad signature, expired).
 * Never throws.
 */
export async function verifySessionToken(
	token: string | undefined | null,
	secret: string,
): Promise<SessionClaims | null> {
	if (!token || !secret) return null;

	const parts = token.split(".");
	if (parts.length !== 3) return null;
	const [encodedHeader, encodedPayload, providedSignature] = parts;

	try {
		const header = JSON.parse(base64UrlDecodeToString(encodedHeader)) as {
			alg?: string;
		};
		if (header.alg !== "HS256") return null;

		const expectedSignature = await sign(
			`${encodedHeader}.${encodedPayload}`,
			secret,
		);
		if (!timingSafeEqual(providedSignature, expectedSignature)) return null;

		const claims = JSON.parse(
			base64UrlDecodeToString(encodedPayload),
		) as SessionClaims;

		if (typeof claims.exp !== "number") return null;
		const nowSeconds = Math.floor(Date.now() / 1000);
		if (claims.exp <= nowSeconds) return null;

		return claims;
	} catch {
		return null;
	}
}
