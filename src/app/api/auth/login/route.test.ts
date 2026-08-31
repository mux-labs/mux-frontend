/**
 * Tests for #712: login route echoes session block so client can persist
 * the bearer token in sessionStorage and attach it to wallet requests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Minimal Next.js config mock */
vi.mock("@/lib/api/config", () => ({
	getApiBaseUrl: vi.fn(() => ""),
	getUpstreamAuthHeaders: vi.fn(() => ({})),
	isMockFallbackAllowed: vi.fn(() => true),
}));

vi.mock("@/lib/auth/routeAccess", () => ({
	SESSION_TOKEN_COOKIE: "mux_auth_token",
}));

// Import AFTER mocks
import { getApiBaseUrl, isMockFallbackAllowed } from "@/lib/api/config";
import { POST } from "@/app/api/auth/login/route";

function makeRequest(body: unknown) {
	return new Request("http://localhost/api/auth/login", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("/api/auth/login — #712 session block", () => {
	beforeEach(() => {
		vi.mocked(getApiBaseUrl).mockReturnValue("");
		vi.mocked(isMockFallbackAllowed).mockReturnValue(true);
	});

	it("returns a session block in the mock fallback response", async () => {
		const res = await POST(makeRequest({ email: "dev@example.com", password: "password123" }));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.session).toBeDefined();
		expect(typeof body.session.accessToken).toBe("string");
		expect(body.session.accessToken.length).toBeGreaterThan(0);
	});

	it("includes user in the mock fallback response alongside session", async () => {
		const res = await POST(makeRequest({ email: "alice@example.com", password: "pass123" }));
		const body = await res.json();
		expect(body.user).toBeDefined();
		expect(body.user.email).toBe("alice@example.com");
		expect(body.session).toBeDefined();
	});

	it("returns 503 when no backend and production mode", async () => {
		vi.mocked(isMockFallbackAllowed).mockReturnValue(false);
		const res = await POST(makeRequest({ email: "dev@example.com", password: "pass" }));
		expect(res.status).toBe(503);
		const body = await res.json();
		expect(body.error).toBe("backend_unavailable");
	});

	it("returns 400 for missing email", async () => {
		const res = await POST(makeRequest({ password: "pass123" }));
		expect(res.status).toBe(400);
	});

	it("returns 400 for missing password", async () => {
		const res = await POST(makeRequest({ email: "dev@example.com" }));
		expect(res.status).toBe(400);
	});

	it("proxies to backend and echoes session block when backend is configured", async () => {
		vi.mocked(getApiBaseUrl).mockReturnValue("https://api.example.com");

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({
				user: { name: "Dev", email: "dev@example.com", role: "developer" },
				accessToken: "real-token-from-backend",
			}),
		});
		vi.stubGlobal("fetch", mockFetch);

		const res = await POST(makeRequest({ email: "dev@example.com", password: "realpass" }));
		expect(res.status).toBe(200);
		const body = await res.json();
		// Session block should be synthesised from the backend's accessToken
		expect(body.session).toBeDefined();
		expect(body.session.accessToken).toBe("real-token-from-backend");

		vi.unstubAllGlobals();
	});
});
