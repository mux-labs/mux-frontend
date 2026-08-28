import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getApiBaseUrl,
	getApiKey,
	getApiSecret,
	getUpstreamAuthHeaders,
} from "../config";

describe("getApiBaseUrl", () => {
	beforeEach(() => {
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("returns NEXT_PUBLIC_API_URL when configured", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
		expect(getApiBaseUrl()).toBe("https://api.example.com");
	});

	it("falls back to NEXT_PUBLIC_MUX_API_URL when API_URL is missing", () => {
		vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "https://legacy-api.example.com");
		expect(getApiBaseUrl()).toBe("https://legacy-api.example.com");
	});

	it("falls back to NEXT_PUBLIC_API_BASE when newer names are missing", () => {
		vi.stubEnv("NEXT_PUBLIC_API_BASE", "https://api-base.example.com");
		expect(getApiBaseUrl()).toBe("https://api-base.example.com");
	});

	it("normalizes trailing slashes from the configured URL", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com///");
		expect(getApiBaseUrl()).toBe("https://api.example.com");
	});

	it("returns empty string when no API base URL is configured", () => {
		expect(getApiBaseUrl()).toBe("");
	});
});

describe("getApiKey / getApiSecret", () => {
	beforeEach(() => {
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("reads the server-only MUX_API_KEY, never the public NEXT_PUBLIC_MUX_API_KEY", () => {
		// A regression guard for #636: the project API key must never be
		// sourced from a NEXT_PUBLIC_* var, since that ships to every browser.
		vi.stubEnv("NEXT_PUBLIC_MUX_API_KEY", "leaked-public-key");
		vi.stubEnv("MUX_API_KEY", "server-secret-key");
		expect(getApiKey()).toBe("server-secret-key");
	});

	it("returns undefined when only the public-looking var is set", () => {
		vi.stubEnv("NEXT_PUBLIC_MUX_API_KEY", "leaked-public-key");
		expect(getApiKey()).toBeUndefined();
	});

	it("reads MUX_API_SECRET", () => {
		vi.stubEnv("MUX_API_SECRET", "server-secret-value");
		expect(getApiSecret()).toBe("server-secret-value");
	});
});

describe("getUpstreamAuthHeaders", () => {
	beforeEach(() => {
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("sends both x-api-key and x-api-secret when configured", () => {
		vi.stubEnv("MUX_API_KEY", "key-123");
		vi.stubEnv("MUX_API_SECRET", "secret-456");
		expect(getUpstreamAuthHeaders()).toEqual({
			"x-api-key": "key-123",
			"x-api-secret": "secret-456",
		});
	});

	it("omits headers that are not configured", () => {
		expect(getUpstreamAuthHeaders()).toEqual({});
	});
});
