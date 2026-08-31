/**
 * Tests for #709: /api/settings must proxy to mux-backend and must not
 * serve mock data in production.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/config", () => ({
	getBackendApiBaseUrl: vi.fn(() => ""),
	getUpstreamAuthHeaders: vi.fn(() => ({})),
	isMockFallbackAllowed: vi.fn(() => true),
}));

import {
	getBackendApiBaseUrl,
	isMockFallbackAllowed,
} from "@/lib/api/config";
import { GET, PATCH } from "@/app/api/settings/route";

function makeGetRequest(opts?: { auth?: string }) {
	const headers: Record<string, string> = {};
	if (opts?.auth !== undefined) headers.authorization = opts.auth;
	return new Request("http://localhost/api/settings", {
		method: "GET",
		headers,
	});
}

function makePatchRequest(body: unknown, opts?: { auth?: string }) {
	const headers: Record<string, string> = {
		"content-type": "application/json",
	};
	if (opts?.auth !== undefined) headers.authorization = opts.auth;
	return new Request("http://localhost/api/settings", {
		method: "PATCH",
		headers,
		body: JSON.stringify(body),
	});
}

const validSettings = {
	displayName: "Alice Dev",
	emailUpdates: true,
	compactWallets: false,
};

describe("/api/settings — #709", () => {
	beforeEach(() => {
		vi.mocked(getBackendApiBaseUrl).mockReturnValue("");
		vi.mocked(isMockFallbackAllowed).mockReturnValue(true);
	});

	// ── GET ──────────────────────────────────────────────────────────────────

	describe("GET", () => {
		it("returns 401 when Authorization header is missing", async () => {
			const res = await GET(makeGetRequest());
			expect(res.status).toBe(401);
			const body = await res.json();
			expect(body.error).toBe("missing_auth");
		});

		it("returns 401 when Authorization is not Bearer", async () => {
			const res = await GET(makeGetRequest({ auth: "Basic abc" }));
			expect(res.status).toBe(401);
		});

		it("returns mock settings in non-production when no backend configured", async () => {
			const res = await GET(makeGetRequest({ auth: "Bearer mock-token" }));
			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.settings).toBeDefined();
			expect(typeof body.settings.emailUpdates).toBe("boolean");
			expect(typeof body.settings.compactWallets).toBe("boolean");
		});

		it("returns 503 in production when no backend configured", async () => {
			vi.mocked(isMockFallbackAllowed).mockReturnValue(false);
			const res = await GET(makeGetRequest({ auth: "Bearer token" }));
			expect(res.status).toBe(503);
			const body = await res.json();
			expect(body.error).toBe("backend_unavailable");
		});

		it("proxies to backend when MUX_BACKEND_URL is set", async () => {
			vi.mocked(getBackendApiBaseUrl).mockReturnValue(
				"https://backend.example.com",
			);
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ settings: validSettings }),
			});
			vi.stubGlobal("fetch", mockFetch);

			const res = await GET(makeGetRequest({ auth: "Bearer real-token" }));
			expect(res.status).toBe(200);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://backend.example.com/developers/me/settings",
				expect.any(Object),
			);

			vi.unstubAllGlobals();
		});
	});

	// ── PATCH ─────────────────────────────────────────────────────────────────

	describe("PATCH", () => {
		it("returns 401 when Authorization header is missing", async () => {
			const res = await PATCH(makePatchRequest(validSettings));
			expect(res.status).toBe(401);
		});

		it("returns 400 for invalid body (missing displayName)", async () => {
			const res = await PATCH(
				makePatchRequest(
					{ emailUpdates: true, compactWallets: false },
					{ auth: "Bearer token" },
				),
			);
			expect(res.status).toBe(400);
		});

		it("returns 400 when displayName is empty string", async () => {
			const res = await PATCH(
				makePatchRequest(
					{ ...validSettings, displayName: "" },
					{ auth: "Bearer token" },
				),
			);
			expect(res.status).toBe(400);
		});

		it("returns 400 when emailUpdates is not boolean", async () => {
			const res = await PATCH(
				makePatchRequest(
					{ ...validSettings, emailUpdates: "yes" },
					{ auth: "Bearer token" },
				),
			);
			expect(res.status).toBe(400);
		});

		it("returns mock echo in non-production with no backend", async () => {
			const res = await PATCH(
				makePatchRequest(validSettings, { auth: "Bearer mock-token" }),
			);
			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.settings.displayName).toBe(validSettings.displayName);
			expect(body.settings.emailUpdates).toBe(validSettings.emailUpdates);
		});

		it("trims displayName whitespace in mock echo", async () => {
			const res = await PATCH(
				makePatchRequest(
					{ ...validSettings, displayName: "  Alice  " },
					{ auth: "Bearer mock-token" },
				),
			);
			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.settings.displayName).toBe("Alice");
		});

		it("returns 503 in production with no backend", async () => {
			vi.mocked(isMockFallbackAllowed).mockReturnValue(false);
			const res = await PATCH(
				makePatchRequest(validSettings, { auth: "Bearer token" }),
			);
			expect(res.status).toBe(503);
		});

		it("proxies to backend when MUX_BACKEND_URL is set", async () => {
			vi.mocked(getBackendApiBaseUrl).mockReturnValue(
				"https://backend.example.com",
			);
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ settings: validSettings }),
			});
			vi.stubGlobal("fetch", mockFetch);

			const res = await PATCH(
				makePatchRequest(validSettings, { auth: "Bearer real-token" }),
			);
			expect(res.status).toBe(200);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://backend.example.com/developers/me/settings",
				expect.objectContaining({ method: "PATCH" }),
			);

			vi.unstubAllGlobals();
		});
	});
});
