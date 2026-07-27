import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithAuth, UnauthorizedError } from "../fetchWithAuth";

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

	it("redirects 401 responses to login with the full current URL as callback", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 401 }));

		await expect(fetchWithAuth("/api/wallets")).rejects.toBeInstanceOf(
			UnauthorizedError,
		);

		expect(sessionStorage.getItem("mux_auth_user")).toBeNull();
		expect(replace).toHaveBeenCalledWith(
			"https://console.mux.test/login?callbackUrl=%2Fdemo%2Fdashboard%2Fwallets%3Fnetwork%3Dtestnet%23active",
		);
	});
});
