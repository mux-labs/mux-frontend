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

	it("returns the required env when all pieces are present", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
		vi.stubEnv("E2E_TEST_EMAIL", "qa@example.com");
		vi.stubEnv("E2E_TEST_PASSWORD", "correct-horse");
		expect(readRealBackendEnv()).toEqual({
			apiUrl: "https://api.example.com",
			email: "qa@example.com",
			password: "correct-horse",
		});
	});

	it("returns null when any single required piece is missing", () => {
		const complete = {
			NEXT_PUBLIC_API_URL: "https://api.example.com",
			E2E_TEST_EMAIL: "qa@example.com",
			E2E_TEST_PASSWORD: "correct-horse",
		} as const;

		for (const key of Object.keys(complete) as (keyof typeof complete)[]) {
			vi.unstubAllEnvs();
			for (const [name, value] of Object.entries(complete)) {
				vi.stubEnv(name, name === key ? "" : value);
			}
			expect(readRealBackendEnv()).toBeNull();
		}
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

	it("redacts a bearer token for safe logging", () => {
		const token = "Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature";
		const redacted = redactToken(token);
		expect(redacted).toBe("Bear…ture");
		expect(redacted).not.toContain("eyJhbGciOiJIUzI1NiJ9");
		expect(redacted).not.toContain("payload");
	});

	it("fails closed on the short-token path named in the doc comment", () => {
		// Doc comment: never print raw tokens or key material. Tokens too
		// short to keep a prefix/suffix must be fully masked, not echoed.
		const shortToken = "abc123";
		expect(redactToken(shortToken)).toBe("***");
		expect(redactToken(shortToken)).not.toContain(shortToken);
	});
});
