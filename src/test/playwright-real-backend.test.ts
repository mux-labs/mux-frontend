import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loudly } from "@/lib/e2e-env-guard";

// Ensure the module-level guards in playwright.real-backend.config.ts don't
// fire during test collection (they read the same opt-out flag).
beforeEach(() => {
	process.env.E2E_REAL_BACKEND_ALLOW_MISSING_API_URL = "1";
});

afterEach(() => {
	delete process.env.E2E_REAL_BACKEND_ALLOW_MISSING_API_URL;
	delete process.env.NEXT_PUBLIC_API_URL;
	delete process.env.TEST_LOUDLY_VAR;
});

describe("loudly", () => {
	it("returns the value when the env var is set and opt-out is off", () => {
		delete process.env.E2E_REAL_BACKEND_ALLOW_MISSING_API_URL;
		process.env.TEST_LOUDLY_VAR = "https://api.example.com";
		expect(loudly("TEST_LOUDLY_VAR")).toBe("https://api.example.com");
	});

	it("throws when the env var is absent and opt-out is off", () => {
		delete process.env.E2E_REAL_BACKEND_ALLOW_MISSING_API_URL;
		delete process.env.TEST_LOUDLY_VAR;
		expect(() => loudly("TEST_LOUDLY_VAR")).toThrow("TEST_LOUDLY_VAR");
	});

	it("throws when the env var is an empty string and opt-out is off", () => {
		delete process.env.E2E_REAL_BACKEND_ALLOW_MISSING_API_URL;
		process.env.TEST_LOUDLY_VAR = "";
		expect(() => loudly("TEST_LOUDLY_VAR")).toThrow("TEST_LOUDLY_VAR");
	});

	it("throws when the env var is whitespace only and opt-out is off", () => {
		delete process.env.E2E_REAL_BACKEND_ALLOW_MISSING_API_URL;
		process.env.TEST_LOUDLY_VAR = "   ";
		expect(() => loudly("TEST_LOUDLY_VAR")).toThrow("TEST_LOUDLY_VAR");
	});

	it("does NOT throw when opt-out flag is set, even if the var is missing", () => {
		process.env.E2E_REAL_BACKEND_ALLOW_MISSING_API_URL = "1";
		delete process.env.TEST_LOUDLY_VAR;
		expect(() => loudly("TEST_LOUDLY_VAR")).not.toThrow();
	});

	it("includes the var name and fail-closed in the error message so the developer knows what to fix", () => {
		delete process.env.E2E_REAL_BACKEND_ALLOW_MISSING_API_URL;
		delete process.env.NEXT_PUBLIC_API_URL;
		let message = "";
		try {
			loudly("NEXT_PUBLIC_API_URL");
		} catch (err) {
			message = (err as Error).message;
		}
		expect(message).toContain("NEXT_PUBLIC_API_URL");
		expect(message).toContain("fail-closed");
	});
});
