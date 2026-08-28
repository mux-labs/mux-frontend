/**
 * Tests for session.js — session storage security migration.
 *
 * Verifies that session tokens are stored in sessionStorage (not localStorage)
 * and that the basic lifecycle (save → load → validate → clear) works correctly.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	clearSession,
	createDemoSession,
	createExpiredDemoSession,
	createSession,
	isSessionValid,
	loadSession,
	STORAGE_KEY,
	saveSession,
} from "../session";

describe("session.js — sessionStorage security migration", () => {
	beforeEach(() => {
		// Ensure sessionStorage is clean before each test
		if (typeof window !== "undefined" && window.sessionStorage) {
			window.sessionStorage.clear();
		}
	});

	afterEach(() => {
		if (typeof window !== "undefined" && window.sessionStorage) {
			window.sessionStorage.clear();
		}
	});

	it("stores session in sessionStorage, not localStorage", () => {
		const session = createDemoSession();
		saveSession(session);

		const stored = window.sessionStorage.getItem(STORAGE_KEY);
		expect(stored).not.toBeNull();

		// Verify localStorage was NOT written to
		const localStored = window.localStorage.getItem(STORAGE_KEY);
		expect(localStored).toBeNull();
	});

	it("loadSession returns null when no session is stored", () => {
		expect(loadSession()).toBeNull();
	});

	it("loadSession parses a valid session back", () => {
		const session = createDemoSession();
		saveSession(session);

		const loaded = loadSession();
		expect(loaded).not.toBeNull();
		expect(loaded.accessToken).toBe(session.accessToken);
		expect(loaded.refreshToken).toBe(session.refreshToken);
		expect(loaded.expiresAt).toBe(session.expiresAt);
	});

	it("clearSession removes the stored record", () => {
		saveSession(createDemoSession());
		expect(window.sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();

		clearSession();
		expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
		expect(loadSession()).toBeNull();
	});

	it("isSessionValid returns true for a non-expired session", () => {
		const session = createDemoSession(); // expiresAt = now + 30s
		expect(isSessionValid(session)).toBe(true);
	});

	it("isSessionValid returns false for an expired session", () => {
		const session = createExpiredDemoSession(); // expiresAt = now - 5s
		expect(isSessionValid(session)).toBe(false);
	});

	it("isSessionValid returns false for null / invalid input", () => {
		expect(isSessionValid(null)).toBe(false);
		expect(isSessionValid(undefined)).toBe(false);
		expect(isSessionValid({})).toBe(false);
		expect(isSessionValid({ accessToken: "x" })).toBe(false);
	});

	describe("createSession — build a record from a login token block (#628)", () => {
		it("derives expiresAt from expiresIn (seconds)", () => {
			const before = Date.now();
			const record = createSession({
				accessToken: "a",
				refreshToken: "r",
				expiresIn: 900,
			});
			expect(record).not.toBeNull();
			expect(record!.accessToken).toBe("a");
			expect(record!.refreshToken).toBe("r");
			expect(record!.expiresAt).toBeGreaterThanOrEqual(before + 900_000 - 100);
			expect(isSessionValid(record)).toBe(true);
		});

		it("passes an explicit expiresAt through unchanged", () => {
			const at = Date.now() + 5_000;
			expect(
				createSession({ accessToken: "a", expiresAt: at })!.expiresAt,
			).toBe(at);
		});

		it("returns null when there is no access token", () => {
			expect(createSession(undefined)).toBeNull();
			expect(createSession({})).toBeNull();
			expect(createSession({ refreshToken: "r" })).toBeNull();
		});

		it("round-trips through saveSession/loadSession", () => {
			const record = createSession({ accessToken: "tok", expiresIn: 60 });
			saveSession(record);
			expect(loadSession()!.accessToken).toBe("tok");
		});
	});

	it("handles corrupt storage data gracefully", () => {
		window.sessionStorage.setItem(STORAGE_KEY, "{not valid json");
		const loaded = loadSession();
		expect(loaded).toBeNull();
		// Should clean up the corrupt entry
		expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
	});

	it("handles missing window (SSR) by returning null from loadSession", () => {
		const originalWindow = globalThis.window;
		// @ts-expect-error - simulate SSR
		delete (globalThis as { window?: unknown }).window;

		try {
			expect(loadSession()).toBeNull();
		} finally {
			globalThis.window = originalWindow;
		}
	});

	it("handles missing window (SSR) in saveSession without throwing", () => {
		const originalWindow = globalThis.window;
		// @ts-expect-error - simulate SSR
		delete (globalThis as { window?: unknown }).window;

		try {
			expect(() => saveSession(createDemoSession())).not.toThrow();
		} finally {
			globalThis.window = originalWindow;
		}
	});
});
