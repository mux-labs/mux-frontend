import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	API_URL_CANDIDATES,
	getActiveApiUrlVar,
	getApiBaseUrl,
	getApiKey,
	getApiSecret,
	getBackendApiBaseUrl,
	getServerApiKey,
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

	// --- #693: empty-string alias skipping ---

	it("skips NEXT_PUBLIC_API_URL when set to an empty string and falls back to MUX_API_URL", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "");
		vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "https://legacy.example.com");
		expect(getApiBaseUrl()).toBe("https://legacy.example.com");
	});

	it("skips NEXT_PUBLIC_API_URL when set to whitespace and falls back to next alias", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "   ");
		vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "https://legacy.example.com");
		expect(getApiBaseUrl()).toBe("https://legacy.example.com");
	});

	it("skips all empty aliases and returns empty string when all are blank", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "");
		vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "");
		vi.stubEnv("NEXT_PUBLIC_API_BASE", "");
		expect(getApiBaseUrl()).toBe("");
	});

	it("NEXT_PUBLIC_API_URL takes priority over MUX_API_URL when both are set", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "https://primary.example.com");
		vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "https://legacy.example.com");
		expect(getApiBaseUrl()).toBe("https://primary.example.com");
	});
});

describe("getActiveApiUrlVar (#693)", () => {
	beforeEach(() => {
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("returns NEXT_PUBLIC_API_URL when it is the active alias", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
		expect(getActiveApiUrlVar()).toBe("NEXT_PUBLIC_API_URL");
	});

	it("returns NEXT_PUBLIC_MUX_API_URL when that is the active alias", () => {
		vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "https://legacy.example.com");
		expect(getActiveApiUrlVar()).toBe("NEXT_PUBLIC_MUX_API_URL");
	});

	it("returns NEXT_PUBLIC_API_BASE when that is the only set alias", () => {
		vi.stubEnv("NEXT_PUBLIC_API_BASE", "https://base.example.com");
		expect(getActiveApiUrlVar()).toBe("NEXT_PUBLIC_API_BASE");
	});

	it("returns null when no alias is configured", () => {
		expect(getActiveApiUrlVar()).toBeNull();
	});

	it("skips empty-string aliases when finding the active var", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "");
		vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "https://legacy.example.com");
		expect(getActiveApiUrlVar()).toBe("NEXT_PUBLIC_MUX_API_URL");
	});
});

describe("API_URL_CANDIDATES constant (#693)", () => {
	it("lists the three aliases in priority order", () => {
		expect(API_URL_CANDIDATES).toEqual([
			"NEXT_PUBLIC_API_URL",
			"NEXT_PUBLIC_MUX_API_URL",
			"NEXT_PUBLIC_API_BASE",
		]);
	});

	it("does not include server-only vars", () => {
		for (const candidate of API_URL_CANDIDATES) {
			expect(candidate).toMatch(/^NEXT_PUBLIC_/);
		}
	});
});

describe("getBackendApiBaseUrl", () => {
	beforeEach(() => {
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("reads the server-only MUX_BACKEND_URL", () => {
		vi.stubEnv("MUX_BACKEND_URL", "https://backend.internal");
		expect(getBackendApiBaseUrl()).toBe("https://backend.internal");
	});

	it("normalizes trailing slashes", () => {
		vi.stubEnv("MUX_BACKEND_URL", "https://backend.internal///");
		expect(getBackendApiBaseUrl()).toBe("https://backend.internal");
	});

	it("returns an empty string when unset so the route can 503 instead of faking data", () => {
		expect(getBackendApiBaseUrl()).toBe("");
	});

	it("does not fall back to a NEXT_PUBLIC_* URL", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "https://public-api.example.com");
		expect(getBackendApiBaseUrl()).toBe("");
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

	it("getServerApiKey is an alias for getApiKey (backward compat)", () => {
		vi.stubEnv("MUX_API_KEY", "key-abc");
		expect(getServerApiKey()).toBe(getApiKey());
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
