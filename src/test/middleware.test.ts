/**
 * Tests for #632: /demo/dashboard must be protected by the same auth
 * middleware as /dashboard. Without this the full dashboard shell (mock
 * wallets, fake analytics) is publicly reachable in production builds.
 */
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, middleware } from "@/middleware";

function requestFor(pathname: string, opts: { session?: string } = {}) {
	const headers = new Headers();
	if (opts.session) {
		headers.set("cookie", `mux_auth_session=${opts.session}`);
	}
	return new NextRequest(`https://console.mux.dev${pathname}`, { headers });
}

const protectedPaths = [
	"/dashboard",
	"/dashboard/wallets",
	"/demo/dashboard",
	"/demo/dashboard/wallets",
	"/demo/dashboard/wallets/w-001",
	"/demo/dashboard/analytics",
];

describe("auth middleware", () => {
	it.each(
		protectedPaths,
	)("redirects unauthenticated requests for %s to /login", (pathname) => {
		const res = middleware(requestFor(pathname));

		expect(res.status).toBe(307);
		const location = new URL(res.headers.get("location") ?? "");
		expect(location.pathname).toBe("/login");
		expect(location.searchParams.get("callbackUrl")).toBe(pathname);
	});

	it.each(
		protectedPaths,
	)("lets authenticated requests for %s through", (pathname) => {
		const res = middleware(requestFor(pathname, { session: "token-abc" }));

		expect(res.headers.get("location")).toBeNull();
		expect(res.status).toBe(200);
	});

	it("does not gate unrelated public routes", () => {
		const res = middleware(requestFor("/demo"));
		expect(res.headers.get("location")).toBeNull();
		expect(res.status).toBe(200);
	});

	it("matcher covers both /dashboard and /demo/dashboard trees", () => {
		expect(config.matcher).toEqual(
			expect.arrayContaining([
				"/dashboard",
				"/dashboard/:path*",
				"/demo/dashboard",
				"/demo/dashboard/:path*",
			]),
		);
	});
});
