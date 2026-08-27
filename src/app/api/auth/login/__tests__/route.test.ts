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

	describe("production without a configured backend", () => {
		it("returns 503 instead of silently signing in any credentials", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "");
			vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "");
			vi.stubEnv("NEXT_PUBLIC_API_BASE", "");
			vi.stubEnv("NODE_ENV", "production");

			const res = await POST(
				makeRequest({ email: "anyone@example.com", password: "anything123" }),
			);

			expect(res.status).toBe(503);
			const body = await res.json();
			expect(body.error).toBe("backend_unavailable");
			expect(body.user).toBeUndefined();
		});
	});
});
