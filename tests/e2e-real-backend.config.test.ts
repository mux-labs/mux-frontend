/**
 * Vitest coverage for the real-backend e2e infrastructure added alongside
 * tests/e2e/real-backend/ (see that directory's README.md).
 *
 * Playwright itself isn't exercised here — these are fast, non-browser
 * checks that the two Playwright configs keep their intended contract
 * (mock-forced vs. real-backend-passthrough) and that the env-reading
 * helper behind the real-backend specs' skip logic is correct.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import mockConfig from "../playwright.config";
import realBackendConfig from "../playwright.real-backend.config";
import {
	readRealBackendEnv,
	REAL_BACKEND_SKIP_REASON,
} from "./e2e/real-backend/helpers";

function firstWebServer(
	config: typeof mockConfig | typeof realBackendConfig,
) {
	const { webServer } = config;
	return Array.isArray(webServer) ? webServer[0] : webServer;
}

describe("playwright.config.ts (mock suite)", () => {
	it("forces NEXT_PUBLIC_API_URL to empty so tests/e2e/ always talks to the mock", () => {
		const webServer = firstWebServer(mockConfig);
		expect(webServer?.env).toEqual({ NEXT_PUBLIC_API_URL: "" });
	});

	it("points at the mock-only spec directory", () => {
		expect(mockConfig.testDir).toBe("./tests/e2e");
	});
});

describe("playwright.real-backend.config.ts (real-backend suite)", () => {
	it("points at a dedicated spec directory, separate from the mock suite", () => {
		expect(realBackendConfig.testDir).toBe("./tests/e2e/real-backend");
		expect(realBackendConfig.testDir).not.toBe(mockConfig.testDir);
	});

	it("does not force NEXT_PUBLIC_API_URL, letting a real value pass through from the shell", () => {
		const webServer = firstWebServer(realBackendConfig);
		const env = webServer && "env" in webServer ? webServer.env : undefined;
		expect(env?.NEXT_PUBLIC_API_URL).toBeUndefined();
	});
});

describe("readRealBackendEnv", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("returns null when NEXT_PUBLIC_API_URL is missing", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "");
		vi.stubEnv("E2E_TEST_EMAIL", "qa@example.com");
		vi.stubEnv("E2E_TEST_PASSWORD", "correct-horse");
		expect(readRealBackendEnv()).toBeNull();
	});

	it("returns null when E2E_TEST_EMAIL or E2E_TEST_PASSWORD is missing", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
		vi.stubEnv("E2E_TEST_EMAIL", "");
		vi.stubEnv("E2E_TEST_PASSWORD", "");
		expect(readRealBackendEnv()).toBeNull();
	});

	it("returns the trimmed env when all three vars are set", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", " https://api.example.com ");
		vi.stubEnv("E2E_TEST_EMAIL", " qa@example.com ");
		vi.stubEnv("E2E_TEST_PASSWORD", " correct-horse ");
		expect(readRealBackendEnv()).toEqual({
			apiUrl: "https://api.example.com",
			email: "qa@example.com",
			password: "correct-horse",
		});
	});

	it("exposes a skip reason that points at the real-backend config", () => {
		expect(REAL_BACKEND_SKIP_REASON).toMatch(
			/playwright\.real-backend\.config\.ts/,
		);
	});
});
