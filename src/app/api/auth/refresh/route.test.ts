/**
 * Tests for POST /api/auth/refresh.
 *
 * Covers the explicit production vs demo/mock split:
 * - Backend configured (#626): proxies to `{backend}/auth/refresh`, forwards
 *   the caller's Authorization header, refreshes the HttpOnly session cookie
 *   from a rotated token, and passes upstream errors through.
 * - No backend, non-production: mints a mock access token for the mock
 *   refresh token; rejects anything else.
 * - No backend, production: refuses with `503 backend_unavailable` so the
 *   hardcoded mock token can never be an auth bypass in prod.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function makeRequest(body: unknown, headers?: Record<string, string>): Request {
	return new Request("http://localhost/api/auth/refresh", {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: JSON.stringify(body),
	});
}

describe("POST /api/auth/refresh", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	describe("mock fallback (no backend, non-production)", () => {
		it("mints a mock access token for the valid mock refresh token", async () => {
			const res = await POST(
				makeRequest({ refreshToken: "mock-refresh-token" }),
			);
			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body).toMatchObject({
				accessToken: "mock-access-token",
				refreshToken: "mock-refresh-token",
			});
		});

		it("rejects an invalid refresh token", async () => {
			const res = await POST(
				makeRequest({ refreshToken: "not-the-right-token" }),
			);
			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.error).toBe("invalid_refresh");
		});

		it("rejects a missing/malformed body", async () => {
			const res = await POST(
				new Request("http://localhost/api/auth/refresh", {
					method: "POST",
					body: "not-json",
				}),
			);
			expect(res.status).toBe(401);
		});
	});

	describe("backend proxy (NEXT_PUBLIC_API_URL is set) — #626", () => {
		it("proxies to {backend}/auth/refresh and refreshes the session cookie", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
			vi.stubGlobal(
				"fetch",
				vi.fn().mockResolvedValue({
					ok: true,
					status: 200,
					json: () =>
						Promise.resolve({
							accessToken: "rotated-token-xyz",
							expiresIn: 900,
						}),
				}),
			);

			const res = await POST(
				makeRequest(
					{ refreshToken: "whatever" },
					{ authorization: "Bearer stale-token" },
				),
			);

			expect(res.status).toBe(200);
			expect(fetch).toHaveBeenCalledWith(
				"https://api.example.com/auth/refresh",
				expect.objectContaining({ method: "POST" }),
			);
			const init = (
				fetch as unknown as {
					mock: { calls: [string, { headers: Record<string, string> }][] };
				}
			).mock.calls[0][1];
			expect(init.headers.authorization).toBe("Bearer stale-token");

			const cookie = res.cookies.get("mux_auth_token");
			expect(cookie?.value).toBe("rotated-token-xyz");
			expect(cookie?.httpOnly).toBe(true);
			expect(cookie?.sameSite).toBe("lax");
		});

		it("passes an upstream 401 through unchanged", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
			vi.stubGlobal(
				"fetch",
				vi.fn().mockResolvedValue({
					ok: false,
					status: 401,
					json: () => Promise.resolve({ error: "invalid_refresh" }),
				}),
			);

			const res = await POST(makeRequest({ refreshToken: "expired" }));
			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.error).toBe("invalid_refresh");
		});

		it("returns 502 when the backend is unreachable", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
			vi.stubGlobal(
				"fetch",
				vi.fn().mockRejectedValue(new Error("Connection refused")),
			);

			const res = await POST(makeRequest({ refreshToken: "x" }));
			expect(res.status).toBe(502);
		});
	});

	describe("production without a configured backend", () => {
		it("returns 503 instead of accepting the hardcoded mock refresh token", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "");
			vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "");
			vi.stubEnv("NEXT_PUBLIC_API_BASE", "");
			vi.stubEnv("NODE_ENV", "production");

			const res = await POST(
				makeRequest({ refreshToken: "mock-refresh-token" }),
			);

			expect(res.status).toBe(503);
			const body = await res.json();
			expect(body.error).toBe("backend_unavailable");
			expect(body.accessToken).toBeUndefined();
		});
	});
});
