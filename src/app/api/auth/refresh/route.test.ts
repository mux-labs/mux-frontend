/**
 * Tests for POST /api/auth/refresh.
 *
 * This route is mock-only (no real backend proxy branch), so unlike the
 * other API routes it always accepted a hardcoded refresh token. Covers:
 * - Mints a mock access token for the valid mock refresh token
 * - Rejects any other refresh token
 * - Never runs in a production build — the hardcoded token must not be a
 *   usable auth bypass in prod; see `isMockFallbackAllowed()`.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function makeRequest(body: unknown): Request {
	return new Request("http://localhost/api/auth/refresh", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/auth/refresh", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("mints a mock access token for the valid mock refresh token", async () => {
		const res = await POST(makeRequest({ refreshToken: "mock-refresh-token" }));
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

	describe("production", () => {
		it("returns 503 instead of accepting the hardcoded mock refresh token", async () => {
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
