/**
 * Regression tests for assertRealBackendConfigured in
 * playwright.real-backend.config.ts (issue #1162).
 *
 * Documented contract: fail-closed guard — a missing NEXT_PUBLIC_API_URL is a
 * misconfiguration, not a reason to silently fall back to the in-repo mock.
 * Throwing makes the whole run fail loudly instead of producing a green run
 * that never touched a real backend.
 * Set E2E_REAL_BACKEND_ALLOW_MISSING_API_URL=1 to opt out (e.g. when
 * merely collecting/listing specs in CI without a backend available).
 */
import { afterEach, describe, expect, it, vi } from "vitest";

// @playwright/test is not installed in the test environment — stub it so the
// import of playwright.real-backend.config.ts resolves without errors.
vi.mock("@playwright/test", () => ({
	defineConfig: (c: unknown) => c,
	devices: new Proxy({}, { get: () => ({}) }),
}));

// Suppress the top-level assertRealBackendConfigured() / assertRealBackendCredentials()
// calls that run at import time — these tests exercise the function directly.
vi.hoisted(() => {
	process.env.E2E_REAL_BACKEND_ALLOW_MISSING_API_URL = "1";
});

import { assertRealBackendConfigured } from "../playwright.real-backend.config";

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("assertRealBackendConfigured", () => {
	it("throws when NEXT_PUBLIC_API_URL is not set", () => {
		vi.stubEnv("E2E_REAL_BACKEND_ALLOW_MISSING_API_URL", "");
		vi.stubEnv("NEXT_PUBLIC_API_URL", "");
		expect(() => assertRealBackendConfigured()).toThrow(/NEXT_PUBLIC_API_URL/);
	});

	it("throws when NEXT_PUBLIC_API_URL is only whitespace", () => {
		vi.stubEnv("E2E_REAL_BACKEND_ALLOW_MISSING_API_URL", "");
		vi.stubEnv("NEXT_PUBLIC_API_URL", "   ");
		expect(() => assertRealBackendConfigured()).toThrow(/NEXT_PUBLIC_API_URL/);
	});

	it("does not throw when NEXT_PUBLIC_API_URL is set to a non-empty value", () => {
		vi.stubEnv("E2E_REAL_BACKEND_ALLOW_MISSING_API_URL", "");
		vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
		expect(() => assertRealBackendConfigured()).not.toThrow();
	});

	it("does not throw when E2E_REAL_BACKEND_ALLOW_MISSING_API_URL=1, even without a URL", () => {
		vi.stubEnv("E2E_REAL_BACKEND_ALLOW_MISSING_API_URL", "1");
		vi.stubEnv("NEXT_PUBLIC_API_URL", "");
		expect(() => assertRealBackendConfigured()).not.toThrow();
	});

	it("error message names the opt-out env var so the CI operator knows how to proceed", () => {
		vi.stubEnv("E2E_REAL_BACKEND_ALLOW_MISSING_API_URL", "");
		vi.stubEnv("NEXT_PUBLIC_API_URL", "");
		expect(() => assertRealBackendConfigured()).toThrow(
			/E2E_REAL_BACKEND_ALLOW_MISSING_API_URL/,
		);
	});
});
