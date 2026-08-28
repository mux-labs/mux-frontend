/**
 * Tests for server-side route-access evaluation (#621).
 *
 * These lock in the fix for the "cookie-only auth" gap: when a backend is
 * configured, a protected route must require a real, backend-verified session
 * token — the client-settable `mux_auth_session` marker cookie alone must not
 * be enough. They fail if that regression returns.
 */

import { describe, expect, it, vi } from "vitest";
import { evaluateAccess, isProtectedPath } from "../routeAccess";

describe("isProtectedPath", () => {
	it("matches /dashboard and its subpaths", () => {
		expect(isProtectedPath("/dashboard")).toBe(true);
		expect(isProtectedPath("/dashboard/wallets")).toBe(true);
	});

	it("does not match unrelated paths", () => {
		expect(isProtectedPath("/login")).toBe(false);
		expect(isProtectedPath("/demo/dashboard")).toBe(false);
		expect(isProtectedPath("/dashboardish")).toBe(false);
	});
});

describe("evaluateAccess", () => {
	const allowVerify = vi.fn(async () => true);
	const denyVerify = vi.fn(async () => false);

	it("always allows non-protected paths", async () => {
		const d = await evaluateAccess({
			pathname: "/login",
			backendUrl: "https://api.example.com",
			verifyToken: denyVerify,
		});
		expect(d).toEqual({ allow: true });
	});

	describe("backend configured (server-verified mode)", () => {
		it("rejects when there is no token cookie — a marker alone is not trusted", async () => {
			const d = await evaluateAccess({
				pathname: "/dashboard",
				marker: "1",
				backendUrl: "https://api.example.com",
				verifyToken: allowVerify,
			});
			expect(d).toEqual({ allow: false, reason: "no-token" });
			expect(allowVerify).not.toHaveBeenCalled();
		});

		it("rejects when the backend says the token is invalid", async () => {
			const d = await evaluateAccess({
				pathname: "/dashboard/wallets",
				token: "stale-token",
				backendUrl: "https://api.example.com",
				verifyToken: denyVerify,
			});
			expect(d).toEqual({ allow: false, reason: "invalid-token" });
			expect(denyVerify).toHaveBeenCalledWith(
				"https://api.example.com",
				"stale-token",
			);
		});

		it("allows when the backend confirms the token", async () => {
			const d = await evaluateAccess({
				pathname: "/dashboard",
				token: "good-token",
				backendUrl: "https://api.example.com",
				verifyToken: allowVerify,
			});
			expect(d).toEqual({ allow: true });
		});
	});

	describe("no backend (mock mode)", () => {
		it("accepts the marker cookie so local dev works", async () => {
			const d = await evaluateAccess({
				pathname: "/dashboard",
				marker: "1",
				backendUrl: "",
				verifyToken: denyVerify,
			});
			expect(d).toEqual({ allow: true });
		});

		it("rejects when the marker cookie is absent", async () => {
			const d = await evaluateAccess({
				pathname: "/dashboard",
				backendUrl: "",
				verifyToken: allowVerify,
			});
			expect(d).toEqual({ allow: false, reason: "no-marker" });
		});
	});
});
