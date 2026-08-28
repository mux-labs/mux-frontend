/**
 * Tests for /api/notifications (#617).
 *
 * Locks in the production-vs-demo split: mock notifications are served only
 * outside production when no backend is configured. In production without a
 * backend the route must surface an error rather than silently returning
 * mock data (which would hide an outage from operators).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "../route";

function patchRequest(body: unknown): Request {
	return new Request("http://localhost/api/notifications", {
		method: "PATCH",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("GET /api/notifications", () => {
	it("serves mock notifications in dev when no backend is configured", async () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "");
		const res = await GET();
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(Array.isArray(body)).toBe(true);
		expect(body.length).toBeGreaterThan(0);
	});

	it("returns 503 in production when no backend is configured", async () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "");
		vi.stubEnv("NODE_ENV", "production");
		const res = await GET();
		expect(res.status).toBe(503);
		const body = await res.json();
		expect(body.error).toMatch(/not configured/i);
	});

	it("proxies to the backend when one is configured", async () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: () => Promise.resolve([{ id: "n1", title: "x" }]),
			}),
		);
		const res = await GET();
		expect(res.status).toBe(200);
		expect(fetch).toHaveBeenCalledWith(
			"https://api.example.com/notifications",
			expect.objectContaining({ cache: "no-store" }),
		);
	});
});

describe("PATCH /api/notifications", () => {
	it("requires an id or markAll", async () => {
		const res = await PATCH(patchRequest({}));
		expect(res.status).toBe(400);
	});

	it("marks all mock notifications read in dev", async () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "");
		const res = await PATCH(patchRequest({ markAll: true }));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.every((n: { read: boolean }) => n.read)).toBe(true);
	});

	it("returns 503 in production when no backend is configured", async () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "");
		vi.stubEnv("NODE_ENV", "production");
		const res = await PATCH(patchRequest({ markAll: true }));
		expect(res.status).toBe(503);
	});

	it("proxies mark-all-read to the backend when one is configured", async () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ ok: true }),
			}),
		);
		const res = await PATCH(patchRequest({ markAll: true }));
		expect(res.status).toBe(200);
		expect(fetch).toHaveBeenCalledWith(
			"https://api.example.com/notifications/read",
			expect.objectContaining({ method: "PATCH" }),
		);
	});
});
