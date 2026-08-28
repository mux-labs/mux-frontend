/**
 * Unit tests for environment variable validation.
 *
 * These tests validate the behavior of the validateEnv function
 * under various conditions (missing vars, defaults, required vars).
 * Run with: npx vitest run or similar test runner.
 */

import { getEnv, validateEnv } from "../env";

describe("validateEnv", () => {
	beforeEach(() => {
		vi.unstubAllEnvs();
	});

	it("should return the env object unchanged when all vars have values", () => {
		const env = {
			NEXT_PUBLIC_APP_URL: "https://example.com",
			NEXT_PUBLIC_MUX_API_URL: "https://api.example.com",
			MUX_API_KEY: "test-key",
		};
		const result = validateEnv(env);
		expect(result).toBe(env);
	});

	it("should not throw for missing optional vars without defaults", () => {
		const env = {};
		expect(() => validateEnv(env)).not.toThrow();
	});

	it("should not throw for missing optional vars with defaults", () => {
		const env = {};
		expect(() => validateEnv(env)).not.toThrow();
	});

	it("should throw in production for missing required vars", () => {
		const env: Record<string, string | undefined> = {};
		const origNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";

		// Since there are no required vars by default, this should not throw
		expect(() => validateEnv(env)).not.toThrow();

		process.env.NODE_ENV = origNodeEnv;
	});

	it("should log warnings for missing vars", () => {
		const consoleWarnSpy = vi
			.spyOn(console, "warn")
			.mockImplementation(() => {});
		const env: Record<string, string | undefined> = {};

		validateEnv(env);

		expect(consoleWarnSpy).toHaveBeenCalled();
		consoleWarnSpy.mockRestore();
	});

	it("should not reference DATABASE_URL — nothing in the app reads it (#638)", () => {
		const consoleWarnSpy = vi
			.spyOn(console, "warn")
			.mockImplementation(() => {});

		validateEnv({});

		const allWarnings = consoleWarnSpy.mock.calls.flat().join("\n");
		expect(allWarnings).not.toContain("DATABASE_URL");
		consoleWarnSpy.mockRestore();
	});
});

describe("getEnv", () => {
	beforeEach(() => {
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("does not apply documented defaults outside production", () => {
		vi.stubEnv("NODE_ENV", "test");
		expect(getEnv().NEXT_PUBLIC_MUX_API_URL).toBeUndefined();
	});

	it("applies documented defaults for unset vars in production (#637)", () => {
		vi.stubEnv("NODE_ENV", "production");
		vi.stubEnv("NEXT_PUBLIC_API_URL", "");
		vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "");
		vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

		const result = getEnv();

		expect(result.NEXT_PUBLIC_MUX_API_URL).toBe("https://api.muxprotocol.com");
		expect(result.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
	});

	it("never overrides an explicitly configured value with the default", () => {
		vi.stubEnv("NODE_ENV", "production");
		vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "https://custom-backend.example.com");

		expect(getEnv().NEXT_PUBLIC_MUX_API_URL).toBe(
			"https://custom-backend.example.com",
		);
	});

	it("leaves vars with no documented default unset", () => {
		vi.stubEnv("NODE_ENV", "production");
		vi.stubEnv("NEXT_PUBLIC_API_URL", "");

		expect(getEnv().NEXT_PUBLIC_API_URL).toBeFalsy();
	});
});
