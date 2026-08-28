/**
 * Tests for the session-validating middleware (issue #622).
 *
 * The gap this guards against: treating `mux_auth_session` cookie *presence*
 * as proof of authentication. With `SESSION_JWT_SECRET` set, the middleware
 * must verify the JWT signature + expiry.
 */

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signSessionToken } from "@/lib/auth/sessionToken";
import { middleware } from "@/middleware";

const SECRET = "middleware-test-secret-1234567890";

function request(pathname: string, cookie?: string): NextRequest {
	const req = new NextRequest(`https://app.test${pathname}`);
	if (cookie !== undefined) {
		req.cookies.set("mux_auth_session", cookie);
	}
	return req;
}

function isRedirectToLogin(res: Response): boolean {
	if (res.status !== 307 && res.status !== 308) return false;
	const location = res.headers.get("location") ?? "";
	return location.includes("/login");
}

function isPassThrough(res: Response): boolean {
	return res.headers.get("x-middleware-next") === "1";
}

describe("middleware — session validation (#622)", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("lets unprotected routes through untouched", async () => {
		vi.stubEnv("SESSION_JWT_SECRET", SECRET);
		const res = await middleware(request("/login"));
		expect(isPassThrough(res)).toBe(true);
	});

	describe("with SESSION_JWT_SECRET configured", () => {
		it("redirects a protected route when no cookie is present", async () => {
			vi.stubEnv("SESSION_JWT_SECRET", SECRET);
			const res = await middleware(request("/dashboard"));
			expect(isRedirectToLogin(res)).toBe(true);
		});

		it("redirects when the cookie is present but not a valid JWT", async () => {
			vi.stubEnv("SESSION_JWT_SECRET", SECRET);
			const res = await middleware(request("/dashboard/wallets", "1"));
			expect(isRedirectToLogin(res)).toBe(true);
		});

		it("redirects when the JWT is signed with the wrong secret", async () => {
			vi.stubEnv("SESSION_JWT_SECRET", SECRET);
			const token = await signSessionToken({ sub: "a@b.com" }, "wrong-secret");
			const res = await middleware(request("/dashboard", token));
			expect(isRedirectToLogin(res)).toBe(true);
		});

		it("redirects when the JWT is expired", async () => {
			vi.stubEnv("SESSION_JWT_SECRET", SECRET);
			const token = await signSessionToken({ sub: "a@b.com" }, SECRET, -60);
			const res = await middleware(request("/dashboard", token));
			expect(isRedirectToLogin(res)).toBe(true);
		});

		it("allows a protected route with a valid, unexpired JWT", async () => {
			vi.stubEnv("SESSION_JWT_SECRET", SECRET);
			const token = await signSessionToken(
				{ sub: "jane@example.com", role: "developer" },
				SECRET,
			);
			const res = await middleware(request("/dashboard", token));
			expect(isPassThrough(res)).toBe(true);
		});
	});

	describe("without SESSION_JWT_SECRET", () => {
		it("fails closed in production (redirects even with a cookie)", async () => {
			vi.stubEnv("SESSION_JWT_SECRET", "");
			vi.stubEnv("NODE_ENV", "production");
			const res = await middleware(request("/dashboard", "1"));
			expect(isRedirectToLogin(res)).toBe(true);
		});

		it("falls back to a presence check outside production", async () => {
			vi.stubEnv("SESSION_JWT_SECRET", "");
			vi.stubEnv("NODE_ENV", "test");

			const withCookie = await middleware(request("/dashboard", "1"));
			expect(isPassThrough(withCookie)).toBe(true);

			const withoutCookie = await middleware(request("/dashboard"));
			expect(isRedirectToLogin(withoutCookie)).toBe(true);
		});
	});
});
