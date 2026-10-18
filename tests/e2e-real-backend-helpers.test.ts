/**
 * Vitest coverage for the shared real-backend spec helpers (issue #950).
 *
 * `tests/e2e-real-backend.config.test.ts` already covers `readRealBackendEnv`
 * exhaustively against the Playwright config contract; this file focuses on
 * `redactToken`, which previously had no direct test coverage, plus a couple
 * of `readRealBackendEnv` boundary cases so this file stands on its own per
 * the issue's acceptance criteria.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { readRealBackendEnv, redactToken } from "./e2e/real-backend/helpers";

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

	it("returns null when E2E_TEST_EMAIL is missing", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
		vi.stubEnv("E2E_TEST_EMAIL", "");
		vi.stubEnv("E2E_TEST_PASSWORD", "correct-horse");
		expect(readRealBackendEnv()).toBeNull();
	});

	it("returns null when E2E_TEST_PASSWORD is missing", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
		vi.stubEnv("E2E_TEST_EMAIL", "qa@example.com");
		vi.stubEnv("E2E_TEST_PASSWORD", "");
		expect(readRealBackendEnv()).toBeNull();
	});

	it("returns null when NEXT_PUBLIC_API_URL is not an http(s) origin", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "not-a-url");
		vi.stubEnv("E2E_TEST_EMAIL", "qa@example.com");
		vi.stubEnv("E2E_TEST_PASSWORD", "correct-horse");
		expect(readRealBackendEnv()).toBeNull();
	});

	it("returns null when NEXT_PUBLIC_API_URL uses a non-http(s) scheme", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "ftp://api.example.com");
		vi.stubEnv("E2E_TEST_EMAIL", "qa@example.com");
		vi.stubEnv("E2E_TEST_PASSWORD", "correct-horse");
		expect(readRealBackendEnv()).toBeNull();
	});
});

describe("redactToken", () => {
	it("fully masks tokens at or below 8 characters", () => {
		expect(redactToken("")).toBe("***");
		expect(redactToken("short")).toBe("***");
		expect(redactToken("12345678")).toBe("***");
	});

	it("never returns the full token for tokens longer than 8 characters", () => {
		const token = "a-very-long-access-token-value-1234567890";
		const redacted = redactToken(token);
		expect(redacted).not.toBe(token);
		expect(redacted).not.toContain(token);
	});

	it("keeps only the first and last 4 characters for longer tokens", () => {
		const token = "abcd1234efgh5678";
		expect(redactToken(token)).toBe("abcd…5678");
	});

	it("never leaks the middle portion of the token", () => {
		const token = "prefix-SECRET-MIDDLE-suffix";
		const redacted = redactToken(token);
		expect(redacted).not.toContain("SECRET-MIDDLE");
	});
});
