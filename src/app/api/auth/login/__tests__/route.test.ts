/**
 * Tests for POST /api/auth/login (issue #325 — wire auth to backend API)
 *
 * Covers:
 * - Returns 400 for missing credentials
 * - Returns mock user when no NEXT_PUBLIC_API_URL is set
 * - Proxies to backend when NEXT_PUBLIC_API_URL is set
 * - Returns 502 when backend is unreachable
 * - Returns upstream error when backend returns non-ok status
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

function makeRequest(body: unknown): Request {
	return new Request("http://localhost/api/auth/login", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/auth/login (#325)", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	it("returns 400 when body is not valid JSON", async () => {
		const req = new Request("http://localhost/api/auth/login", {
			method: "POST",
			body: "not-json",
		});
		const res = await POST(req);
		expect(res.status).toBe(400);
	});

	it("returns 400 when email is missing", async () => {
		const res = await POST(makeRequest({ password: "secret123" }));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBeTruthy();
	});

	it("returns 400 when password is missing", async () => {
		const res = await POST(makeRequest({ email: "user@example.com" }));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBeTruthy();
	});

	describe("mock fallback (no NEXT_PUBLIC_API_URL)", () => {
		it("returns a user object derived from the email", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "");
			const res = await POST(
				makeRequest({ email: "jane.doe@example.com", password: "secret123" }),
			);
			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.user).toMatchObject({
				email: "jane.doe@example.com",
				role: "developer",
			});
			expect(typeof body.user.name).toBe("string");
		});
	});

	describe("backend proxy (NEXT_PUBLIC_API_URL is set)", () => {
		it("proxies the request to the backend and returns 200 on success", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
			vi.stubGlobal(
				"fetch",
				vi.fn().mockResolvedValue({
					ok: true,
					json: () =>
						Promise.resolve({
							user: {
								name: "Jane",
								email: "jane@example.com",
								role: "developer",
							},
						}),
					status: 200,
				}),
			);

			const res = await POST(
				makeRequest({ email: "jane@example.com", password: "secret123" }),
			);
			expect(res.status).toBe(200);
			expect(fetch).toHaveBeenCalledWith(
				"https://api.example.com/auth/login",
				expect.objectContaining({ method: "POST" }),
			);
		});

		it("returns the upstream status code on 401 from backend", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
			vi.stubGlobal(
				"fetch",
				vi.fn().mockResolvedValue({
					ok: false,
					status: 401,
					json: () => Promise.resolve({ error: "Invalid credentials" }),
				}),
			);

			const res = await POST(
				makeRequest({ email: "jane@example.com", password: "wrong" }),
			);
			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.error).toBe("Invalid credentials");
		});

		it("returns 502 when backend fetch throws (network error)", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
			vi.stubGlobal(
				"fetch",
				vi.fn().mockRejectedValue(new Error("Connection refused")),
			);

			const res = await POST(
				makeRequest({ email: "jane@example.com", password: "secret123" }),
			);
			expect(res.status).toBe(502);
			const body = await res.json();
			expect(body.error).toBeTruthy();
		});
	});

	describe("session cookie (#622)", () => {
		it("sets a verifiable HS256 JWT cookie when SESSION_JWT_SECRET is configured", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "");
			vi.stubEnv("SESSION_JWT_SECRET", "login-route-test-secret-000000000");

			const res = await POST(
				makeRequest({ email: "jane@example.com", password: "secret123" }),
			);
			expect(res.status).toBe(200);

			const setCookie = res.headers.get("set-cookie") ?? "";
			expect(setCookie).toContain("mux_auth_session=");
			expect(setCookie.toLowerCase()).toContain("httponly");

			const match = setCookie.match(/mux_auth_session=([^;]+)/);
			const token = decodeURIComponent(match?.[1] ?? "");
			const { verifySessionToken } = await import("@/lib/auth/sessionToken");
			const claims = await verifySessionToken(
				token,
				"login-route-test-secret-000000000",
			);
			expect(claims?.sub).toBe("jane@example.com");
		});

		it("falls back to the legacy marker cookie when no secret is configured", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "");
			vi.stubEnv("SESSION_JWT_SECRET", "");

			const res = await POST(
				makeRequest({ email: "jane@example.com", password: "secret123" }),
			);
			const setCookie = res.headers.get("set-cookie") ?? "";
			expect(setCookie).toContain("mux_auth_session=1");
		});
	});
});
