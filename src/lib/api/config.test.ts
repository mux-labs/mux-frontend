import { describe, expect, it } from "vitest";

import { buildBackendUrl, normalizeBackendUrl } from "./config";

describe("normalizeBackendUrl", () => {
	it("returns null when the value is missing", () => {
		expect(normalizeBackendUrl(undefined)).toBeNull();
	});

	it("returns null when the value is blank", () => {
		expect(normalizeBackendUrl("")).toBeNull();
		expect(normalizeBackendUrl("   ")).toBeNull();
	});

	it("returns null when the value is malformed", () => {
		expect(normalizeBackendUrl("not a url")).toBeNull();
		expect(normalizeBackendUrl("://missing-scheme")).toBeNull();
	});

	it("returns null for non-http(s) protocols", () => {
		expect(normalizeBackendUrl("ftp://backend.example.com")).toBeNull();
		expect(normalizeBackendUrl("file:///etc/passwd")).toBeNull();
	});

	it("returns null when credentials are embedded", () => {
		expect(normalizeBackendUrl("https://user:pass@backend.example.com")).toBeNull();
		expect(normalizeBackendUrl("https://user@backend.example.com")).toBeNull();
	});

	it("normalizes a valid backend URL to origin + pathname without trailing slashes", () => {
		expect(normalizeBackendUrl("https://backend.example.com")).toBe(
			"https://backend.example.com",
		);
		expect(normalizeBackendUrl("https://backend.example.com/")).toBe(
			"https://backend.example.com",
		);
		expect(normalizeBackendUrl("  https://backend.example.com/api/  ")).toBe(
			"https://backend.example.com/api",
		);
		expect(normalizeBackendUrl("http://localhost:8080")).toBe(
			"http://localhost:8080",
		);
	});
});

describe("buildBackendUrl", () => {
	it("builds an upstream URL for a relative API path on the configured backend", () => {
		expect(
			buildBackendUrl("/api/wallets", {
				MUX_BACKEND_URL: "https://backend.example.com/",
			}),
		).toBe("https://backend.example.com/api/wallets");
		expect(
			buildBackendUrl("/api/wallets/123", {
				MUX_BACKEND_URL: "http://localhost:8080",
			}),
		).toBe("http://localhost:8080/api/wallets/123");
	});

	it("returns null when the backend is not configured", () => {
		expect(buildBackendUrl("/api/wallets", {})).toBeNull();
		expect(buildBackendUrl("/api/wallets", { MUX_BACKEND_URL: "" })).toBeNull();
		expect(
			buildBackendUrl("/api/wallets", { MUX_BACKEND_URL: "not a url" }),
		).toBeNull();
	});

	it("returns null for paths that are not relative API paths", () => {
		const env = { MUX_BACKEND_URL: "https://backend.example.com" };
		expect(buildBackendUrl("api/wallets", env)).toBeNull();
		expect(buildBackendUrl("//evil.example.com/api", env)).toBeNull();
		expect(buildBackendUrl("/api/../admin", env)).toBeNull();
	});
});
