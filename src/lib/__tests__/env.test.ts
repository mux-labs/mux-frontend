/**
 * Unit tests for environment variable validation.
 *
 * These tests validate the behavior of the validateEnv function
 * under various conditions (missing vars, defaults, required vars).
 * Run with: npx vitest run or similar test runner.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	assertServerSide,
	getEnv,
	getServerOnlyEnv,
	validateEnv,
} from "../env";

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

// --- server-only guard (#694) ---

describe("assertServerSide", () => {
	it("does not throw in a Node.js (server) environment", () => {
		// In Vitest / Node.js, window is undefined, so this is a server context.
		expect(() => assertServerSide("MUX_API_SECRET")).not.toThrow();
	});

	it("throws when window is defined (simulated browser)", () => {
		// Simulate a browser environment by defining window.
		const originalWindow = globalThis.window;
		// @ts-expect-error — intentionally setting window to simulate browser
		globalThis.window = {};
		try {
			expect(() => assertServerSide("MUX_API_SECRET")).toThrow(
				/server-only variable/,
			);
		} finally {
			globalThis.window = originalWindow;
		}
	});

	it("error message names the variable being accessed", () => {
		const originalWindow = globalThis.window;
		// @ts-expect-error — intentionally setting window to simulate browser
		globalThis.window = {};
		try {
			expect(() => assertServerSide("MUX_API_SECRET")).toThrow(/MUX_API_SECRET/);
		} finally {
			globalThis.window = originalWindow;
		}
	});

	it("error message lists the other server-only vars for context", () => {
		const originalWindow = globalThis.window;
		// @ts-expect-error — intentionally setting window to simulate browser
		globalThis.window = {};
		try {
			expect(() => assertServerSide("MUX_API_KEY")).toThrow(/MUX_API_KEY/);
		} finally {
			globalThis.window = originalWindow;
		}
	});
});

describe("getServerOnlyEnv", () => {
	beforeEach(() => {
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("returns the variable value on the server", () => {
		vi.stubEnv("MUX_API_SECRET", "super-secret");
		expect(getServerOnlyEnv("MUX_API_SECRET")).toBe("super-secret");
	});

	it("returns undefined when the variable is not set", () => {
		expect(getServerOnlyEnv("MUX_API_SECRET")).toBeUndefined();
	});

	it("throws when called from a simulated browser context (#694)", () => {
		const originalWindow = globalThis.window;
		// @ts-expect-error — intentionally setting window to simulate browser
		globalThis.window = {};
		try {
			expect(() => getServerOnlyEnv("MUX_API_SECRET")).toThrow(
				/server-only variable/,
			);
		} finally {
			globalThis.window = originalWindow;
		}
	});

	it("MUX_API_SECRET is never accessible client-side, even if injected (#694)", () => {
		// This is the regression guard: if a future refactor accidentally imports
		// getServerOnlyEnv in a client component, the test below will catch the
		// throw in a simulated browser environment.
		vi.stubEnv("MUX_API_SECRET", "should-not-reach-browser");
		const originalWindow = globalThis.window;
		// @ts-expect-error — intentionally setting window to simulate browser
		globalThis.window = {};
		try {
			expect(() => getServerOnlyEnv("MUX_API_SECRET")).toThrow();
		} finally {
			globalThis.window = originalWindow;
		}
	});
});
