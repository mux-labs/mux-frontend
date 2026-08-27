import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getApiBaseUrl, isMockFallbackAllowed } from "../config";

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

describe("isMockFallbackAllowed", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("is false in a production build", () => {
		vi.stubEnv("NODE_ENV", "production");
		expect(isMockFallbackAllowed()).toBe(false);
	});

	it("is true outside of production (e.g. development)", () => {
		vi.stubEnv("NODE_ENV", "development");
		expect(isMockFallbackAllowed()).toBe(true);
	});

	it("is true in the test environment", () => {
		vi.stubEnv("NODE_ENV", "test");
		expect(isMockFallbackAllowed()).toBe(true);
	});
});
