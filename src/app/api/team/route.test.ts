/**
 * Tests for GET/POST /api/team.
 *
 * Covers:
 * - Mock fallback list/add in non-production when no backend is configured
 * - Proxies to the backend when NEXT_PUBLIC_API_URL is set
 * - Never falls back to mock team data in a production build — fails
 *   loudly with 503 instead, matching the pattern in
 *   src/app/api/wallets/route.ts / isMockFallbackAllowed().
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

function postRequest(body: unknown): Request {
	return new Request("http://localhost/api/team", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("/api/team", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	describe("mock fallback (no NEXT_PUBLIC_API_URL, non-production)", () => {
		it("lists mock team members", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "");
			vi.stubEnv("NODE_ENV", "test");

			const res = await GET();
			expect(res.status).toBe(200);
			const body = await res.json();
			expect(Array.isArray(body.data)).toBe(true);
			expect(body.data.length).toBeGreaterThan(0);
		});

		it("rejects an invalid role", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "");
			vi.stubEnv("NODE_ENV", "test");

			const res = await POST(
				postRequest({ name: "Test", email: "t@example.com", role: "owner" }),
			);
			expect(res.status).toBe(400);
		});
	});

	describe("backend proxy (NEXT_PUBLIC_API_URL is set)", () => {
		it("proxies GET to the backend", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([{ id: "m1", role: "admin" }]),
			});
			vi.stubGlobal("fetch", fetchMock);

			const res = await GET();
			expect(res.status).toBe(200);
			expect(fetchMock).toHaveBeenCalledWith(
				"https://api.example.com/team",
				expect.any(Object),
			);
		});
	});

	describe("production without a configured backend", () => {
		it("returns 503 instead of silently serving mock team members", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "");
			vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "");
			vi.stubEnv("NEXT_PUBLIC_API_BASE", "");
			vi.stubEnv("NODE_ENV", "production");

			const res = await GET();
			expect(res.status).toBe(503);
			const body = await res.json();
			expect(body.error).toBe("backend_unavailable");
		});
	});
});
