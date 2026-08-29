import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSession, saveSession } from "@/lib/session";
import { fetchWithAuth, UnauthorizedError } from "../fetchWithAuth";

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

describe("fetchWithAuth", () => {
	const originalLocation = window.location;
	const replace = vi.fn();

	beforeEach(() => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
		);
		Object.defineProperty(window, "location", {
			configurable: true,
			value: {
				origin: "https://console.mux.test",
				pathname: "/demo/dashboard/wallets",
				search: "?network=testnet",
				hash: "#active",
				replace,
			},
		});
		sessionStorage.setItem("mux_auth_user", JSON.stringify({ user: {} }));
		document.cookie = "mux_auth_session=1; path=/";
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
		sessionStorage.clear();
		Object.defineProperty(window, "location", {
			configurable: true,
			value: originalLocation,
		});
	});

	it("returns successful responses unchanged", async () => {
		const response = await fetchWithAuth("/api/wallets");

		expect(response.status).toBe(200);
		expect(replace).not.toHaveBeenCalled();
	});

	it("refreshes the token and retries the original request on a 401", async () => {
		saveSession({
			accessToken: "stale-token",
			refreshToken: "refresh-token",
			expiresAt: Date.now() + 60_000,
		});

		vi.mocked(fetch)
			.mockResolvedValueOnce(new Response(null, { status: 401 }))
			.mockResolvedValueOnce(
				jsonResponse({
					accessToken: "fresh-token",
					refreshToken: "next-refresh-token",
					expiresIn: 900,
				}),
			)
			.mockResolvedValueOnce(jsonResponse([{ id: "w1" }]));

		const response = await fetchWithAuth("/api/wallets", {
			headers: { Authorization: "Bearer stale-token" },
		});

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual([{ id: "w1" }]);

		// Refresh endpoint was hit with the stored refresh token.
		expect(fetch).toHaveBeenNthCalledWith(
			2,
			"/api/auth/refresh",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ refreshToken: "refresh-token" }),
			}),
		);

		// Retry carried the rotated bearer token, not the stale one.
		const retryInit = vi.mocked(fetch).mock.calls[2][1] as RequestInit;
		expect(new Headers(retryInit.headers).get("Authorization")).toBe(
			"Bearer fresh-token",
		);

		// Rotated token was persisted; session was NOT torn down.
		expect(loadSession()).toMatchObject({ accessToken: "fresh-token" });
		expect(sessionStorage.getItem("mux_auth_user")).not.toBeNull();
		expect(replace).not.toHaveBeenCalled();
	});

	it("retries on the refreshed HttpOnly cookie when the refresh response carries no token", async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce(new Response(null, { status: 401 }))
			.mockResolvedValueOnce(jsonResponse({ ok: true }))
			.mockResolvedValueOnce(jsonResponse([{ id: "w1" }]));

		const response = await fetchWithAuth("/api/wallets");

		expect(response.status).toBe(200);
		expect(replace).not.toHaveBeenCalled();
	});

	it("clears the session and redirects when the refresh call fails", async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce(new Response(null, { status: 401 }))
			.mockResolvedValueOnce(jsonResponse({ error: "invalid_refresh" }, 401));

		await expect(fetchWithAuth("/api/wallets")).rejects.toBeInstanceOf(
			UnauthorizedError,
		);

		expect(sessionStorage.getItem("mux_auth_user")).toBeNull();
		expect(replace).toHaveBeenCalledWith(
			"https://console.mux.test/login?callbackUrl=%2Fdemo%2Fdashboard%2Fwallets%3Fnetwork%3Dtestnet%23active",
		);
	});

	it("clears the session and redirects when the retried request is still a 401", async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce(new Response(null, { status: 401 }))
			.mockResolvedValueOnce(jsonResponse({ accessToken: "fresh-token" }))
			.mockResolvedValueOnce(new Response(null, { status: 401 }));

		await expect(fetchWithAuth("/api/wallets")).rejects.toBeInstanceOf(
			UnauthorizedError,
		);

		expect(replace).toHaveBeenCalledTimes(1);
		expect(sessionStorage.getItem("mux_auth_user")).toBeNull();
	});
});
