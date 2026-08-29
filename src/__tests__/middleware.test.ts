/**
 * Tests for the route-protection middleware (#652).
 *
 * The gap this guards against: the developer console (`/dashboard` and its
 * `/demo/dashboard` mock mirror) being reachable without a server-verified
 * session. These lock in:
 *
 *  - Protected prefixes redirect unauthenticated requests to
 *    `/login?callbackUrl=<original-path>` (both the `/dashboard` tree and the
 *    `/demo/dashboard` mirror).
 *  - Unprotected routes pass straight through.
 *  - Mock mode (no backend): the client-set `mux_auth_session` marker cookie
 *    is accepted so `pnpm dev` / CI work without a live auth server.
 *  - Backend mode (`NEXT_PUBLIC_API_URL` set): the marker cookie alone is
 *    NOT trusted — a real `mux_auth_token` cookie is required and is verified
 *    against `GET {backend}/auth/session`. A rejected token is cleared from
 *    the browser on the redirect.
 */

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { middleware } from "@/middleware";

const MARKER_COOKIE = "mux_auth_session";
const TOKEN_COOKIE = "mux_auth_token";
const BACKEND = "https://api.example.com";

function request(
	pathname: string,
	cookies: Record<string, string> = {},
): NextRequest {
	const req = new NextRequest(`https://console.mux.dev${pathname}`);
	for (const [name, value] of Object.entries(cookies)) {
		req.cookies.set(name, value);
	}
	return req;
}

function isPassThrough(res: Response): boolean {
	return res.headers.get("x-middleware-next") === "1";
}

function redirectTarget(res: Response): URL | null {
	if (res.status !== 307 && res.status !== 308) return null;
	const location = res.headers.get("location");
	return location ? new URL(location) : null;
}

/** Raw Set-Cookie header value(s) as a single string. */
function setCookieHeader(res: Response): string {
	const getSetCookie = (
		res.headers as Headers & { getSetCookie?: () => string[] }
	).getSetCookie;
	if (typeof getSetCookie === "function")
		return getSetCookie.call(res.headers).join("\n");
	return res.headers.get("set-cookie") ?? "";
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("middleware — route protection (#652)", () => {
	describe("mock mode (no backend configured)", () => {
		it("lets an unprotected route through untouched", async () => {
			const res = await middleware(request("/login"));
			expect(isPassThrough(res)).toBe(true);
		});

		it("lets an unprotected route that merely looks similar through", async () => {
			expect(isPassThrough(await middleware(request("/demo")))).toBe(true);
			expect(isPassThrough(await middleware(request("/dashboardish")))).toBe(
				true,
			);
		});

		it.each([
			"/dashboard",
			"/dashboard/wallets",
			"/demo/dashboard",
			"/demo/dashboard/wallets/w-001",
			"/demo/dashboard/analytics",
		])("redirects %s to /login with the callbackUrl when no cookie is set", async (pathname) => {
			const target = redirectTarget(await middleware(request(pathname)));
			expect(target?.pathname).toBe("/login");
			expect(target?.searchParams.get("callbackUrl")).toBe(pathname);
		});

		it.each([
			"/dashboard",
			"/demo/dashboard/wallets",
		])("accepts the marker cookie for %s so local dev works", async (pathname) => {
			const res = await middleware(request(pathname, { [MARKER_COOKIE]: "1" }));
			expect(isPassThrough(res)).toBe(true);
		});
	});

	describe("backend mode (NEXT_PUBLIC_API_URL set)", () => {
		it("does not trust the marker cookie alone — redirects without clearing cookies", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", BACKEND);
			const fetchMock = vi.fn();
			vi.stubGlobal("fetch", fetchMock);

			const res = await middleware(
				request("/dashboard", { [MARKER_COOKIE]: "1" }),
			);

			expect(redirectTarget(res)?.pathname).toBe("/login");
			// no token to verify → the session endpoint is never called
			expect(fetchMock).not.toHaveBeenCalled();
			expect(setCookieHeader(res)).not.toContain(`${TOKEN_COOKIE}=`);
		});

		it("allows a protected route when the backend confirms the token", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", BACKEND);
			vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

			const res = await middleware(
				request("/dashboard", { [TOKEN_COOKIE]: "good-token" }),
			);
			expect(isPassThrough(res)).toBe(true);
			expect(fetch).toHaveBeenCalledWith(
				`${BACKEND}/auth/session`,
				expect.objectContaining({
					headers: expect.objectContaining({
						authorization: "Bearer good-token",
					}),
				}),
			);
		});

		it("redirects and clears both cookies when the backend rejects the token", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", BACKEND);
			vi.stubGlobal(
				"fetch",
				vi.fn().mockResolvedValue({ ok: false, status: 401 }),
			);

			const res = await middleware(
				request("/demo/dashboard", {
					[TOKEN_COOKIE]: "stale-token",
					[MARKER_COOKIE]: "1",
				}),
			);

			const target = redirectTarget(res);
			expect(target?.pathname).toBe("/login");
			expect(target?.searchParams.get("callbackUrl")).toBe("/demo/dashboard");

			const cookies = setCookieHeader(res);
			expect(cookies).toContain(`${TOKEN_COOKIE}=`);
			expect(cookies).toContain(`${MARKER_COOKIE}=`);
			expect(cookies).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
		});

		it("redirects (fails closed) when the session check throws", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", BACKEND);
			vi.stubGlobal(
				"fetch",
				vi.fn().mockRejectedValue(new Error("network down")),
			);

			const res = await middleware(
				request("/dashboard", { [TOKEN_COOKIE]: "some-token" }),
			);
			expect(redirectTarget(res)?.pathname).toBe("/login");
		});
	});
});
