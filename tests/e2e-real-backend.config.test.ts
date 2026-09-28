/**
 * Vitest coverage for the real-backend e2e infrastructure added alongside
 * tests/e2e/real-backend/ (see that directory's README.md).
 *
 * Playwright itself isn't exercised here — these are fast, non-browser
 * checks that the two Playwright configs keep their intended contract
 * (mock-forced vs. real-backend-passthrough) and that the env-reading
 * helper behind the real-backend specs' skip logic is correct.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

// The real-backend config throws at import when its env is missing (fail
// closed). These are config-shape checks, so opt out explicitly.
vi.hoisted(() => {
	process.env.E2E_REAL_BACKEND_ALLOW_MISSING_API_URL = "1";
});
afterAll(() => {
	delete process.env.E2E_REAL_BACKEND_ALLOW_MISSING_API_URL;
});
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

	it("wires baseURL from the real-backend env so specs hit the configured origin", () => {
		const baseURL = realBackendConfig.use?.baseURL;
		expect(typeof baseURL).toBe("string");
		expect(baseURL).toMatch(/^https?:\/\//);
	});

	it("keeps retries and timeouts bounded for a real network path", () => {
		expect(realBackendConfig.retries).toBeGreaterThanOrEqual(0);
		expect(realBackendConfig.timeout).toBeGreaterThan(0);
	});

	it("declares a reporter so CI surfaces real-backend failures", () => {
		expect(realBackendConfig.reporter).toBeDefined();
	});

	it("fails closed when required real-backend env vars are missing", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "");
		vi.stubEnv("E2E_TEST_EMAIL", "");
		vi.stubEnv("E2E_TEST_PASSWORD", "");
		expect(readRealBackendEnv()).toBeNull();
	});

	it("throws at load without real-backend env, never echoing secret values", async () => {
		const loadConfig = () => {
			vi.resetModules();
			return import("../playwright.real-backend.config");
		};
		try {
			vi.stubEnv("E2E_REAL_BACKEND_ALLOW_MISSING_API_URL", "");
			vi.stubEnv("NEXT_PUBLIC_API_URL", "");
			await expect(loadConfig()).rejects.toThrow(/NEXT_PUBLIC_API_URL/);

			vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
			vi.stubEnv("E2E_TEST_EMAIL", "");
			vi.stubEnv("E2E_TEST_PASSWORD", "s3cret-do-not-log");
			const error = await loadConfig().catch((err: Error) => err);
			expect(error).toBeInstanceOf(Error);
			expect((error as Error).message).toMatch(/E2E_TEST_EMAIL/);
			expect((error as Error).message).not.toContain("s3cret-do-not-log");
		} finally {
			vi.unstubAllEnvs();
			vi.resetModules();
		}
	});

	it("never records traces, which would capture the test password in plain text", () => {
		expect(realBackendConfig.use?.trace).toBe("off");
		for (const project of realBackendConfig.projects ?? []) {
			expect(project.use?.trace ?? "off").toBe("off");
		}
	});

	it("does not commit secrets: config reads env at runtime, not literals", () => {
		const serialized = JSON.stringify(realBackendConfig);
		expect(serialized).not.toMatch(/correct-horse|E2E_TEST_PASSWORD\s*[:=]\s*["'][^"']+["']/);
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

	it("returns null when NEXT_PUBLIC_API_URL is not a valid http(s) origin", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "not-a-url");
		vi.stubEnv("E2E_TEST_EMAIL", "qa@example.com");
		vi.stubEnv("E2E_TEST_PASSWORD", "correct-horse");
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

describe("real-backend secrets docs (#814)", () => {
	const docs = [
		"docs/e2e-real-backend-testing.md",
		"tests/e2e/real-backend/README.md",
	].map((file) => [file, readFileSync(resolve(__dirname, "..", file), "utf8")]);

	it.each(
		docs,
	)("%s documents every variable the suite reads", (_file, text) => {
		for (const name of [
			"NEXT_PUBLIC_API_URL",
			"E2E_TEST_EMAIL",
			"E2E_TEST_PASSWORD",
			"PLAYWRIGHT_BASE_URL",
			"E2E_REAL_BACKEND_ALLOW_MISSING_API_URL",
		]) {
			expect(text).toContain(name);
		}
	});

	it.each(
		docs,
	)("%s does not document variables the suite never reads", (_file, text) => {
		expect(text).not.toMatch(
			/MUX_RPC_URL|MUX_AUTH_URL|MUX_NETWORK|REAL_BACKEND=1|E2E_REAL_BACKEND_(BASE_URL|API_URL|NETWORK|USER|PASSWORD|TIMEOUT_MS|ALLOW_MAINNET)/,
		);
	});

	it("never suggests exposing the test password through NEXT_PUBLIC_*", () => {
		for (const [, text] of docs) {
			expect(text).not.toMatch(/NEXT_PUBLIC_\w*PASSWORD/);
		}
	});
});
