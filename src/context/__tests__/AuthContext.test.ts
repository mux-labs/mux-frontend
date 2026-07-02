/**
 * Tests for AuthContext (issue #46 — document local auth setup)
 *
 * Covers the core session lifecycle described in docs/auth-local-setup.md:
 * - Initial isLoading state
 * - Session rehydration from sessionStorage
 * - Expired session cleanup
 * - Corrupt storage handling
 * - signIn persists session and sets cookie
 * - signOut clears session and cookie
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	AuthProvider,
	SESSION_COOKIE_NAME,
	SESSION_STORAGE_KEY,
	useAuth,
} from "../AuthContext";

function wrapper({ children }: { children: React.ReactNode }) {
	return React.createElement(AuthProvider, null, children);
}

describe("AuthContext — session lifecycle (issue #46)", () => {
	beforeEach(() => {
		sessionStorage.clear();
		// Clear the auth cookie
		document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0`;
	});

	afterEach(() => {
		sessionStorage.clear();
		document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0`;
	});

	it("starts with isLoading=true and user=null", () => {
		const { result } = renderHook(() => useAuth(), { wrapper });
		expect(result.current.isLoading).toBe(true);
		expect(result.current.user).toBeNull();
		expect(result.current.isAuthenticated).toBe(false);
	});

	it("resolves isLoading=false when no session exists", async () => {
		const { result } = renderHook(() => useAuth(), { wrapper });
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.user).toBeNull();
		expect(result.current.isAuthenticated).toBe(false);
	});

	it("rehydrates a valid session from sessionStorage", async () => {
		const record = {
			user: { name: "Jane Doe", email: "jane@example.com", role: "admin" },
			expiresAt: Date.now() + 60_000,
		};
		sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(record));

		const { result } = renderHook(() => useAuth(), { wrapper });
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.user).toEqual(record.user);
		expect(result.current.isAuthenticated).toBe(true);
	});

	it("clears an expired session and stays unauthenticated", async () => {
		const record = {
			user: { name: "Old User", email: "old@example.com", role: "developer" },
			expiresAt: Date.now() - 1000, // already expired
		};
		sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(record));

		const { result } = renderHook(() => useAuth(), { wrapper });
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.user).toBeNull();
		expect(result.current.isAuthenticated).toBe(false);
		expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
	});

	it("handles corrupt sessionStorage gracefully", async () => {
		sessionStorage.setItem(SESSION_STORAGE_KEY, "not-valid-json{{");

		const { result } = renderHook(() => useAuth(), { wrapper });
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.user).toBeNull();
		expect(result.current.isAuthenticated).toBe(false);
		expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
	});

	it("signIn persists the user to sessionStorage", async () => {
		const { result } = renderHook(() => useAuth(), { wrapper });
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		const user = {
			name: "Test User",
			email: "test@example.com",
			role: "developer",
		};
		act(() => {
			result.current.signIn(user);
		});

		expect(result.current.user).toEqual(user);
		expect(result.current.isAuthenticated).toBe(true);

		const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
		expect(stored).not.toBeNull();
		const record = JSON.parse(stored!);
		expect(record.user).toEqual(user);
		expect(record.expiresAt).toBeGreaterThan(Date.now());
	});

	it("signIn sets the mux_auth_session cookie", async () => {
		const { result } = renderHook(() => useAuth(), { wrapper });
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		act(() => {
			result.current.signIn({
				name: "Test",
				email: "test@example.com",
				role: "developer",
			});
		});

		expect(document.cookie).toContain(SESSION_COOKIE_NAME);
	});

	it("signOut clears sessionStorage and resets user to null", async () => {
		const record = {
			user: { name: "Jane", email: "jane@example.com", role: "admin" },
			expiresAt: Date.now() + 60_000,
		};
		sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(record));

		const { result } = renderHook(() => useAuth(), { wrapper });
		await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

		act(() => {
			result.current.signOut();
		});

		expect(result.current.user).toBeNull();
		expect(result.current.isAuthenticated).toBe(false);
		expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
	});

	it("signIn respects a custom TTL", async () => {
		const { result } = renderHook(() => useAuth(), { wrapper });
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		const ttlMs = 30 * 60 * 1000; // 30 minutes
		const before = Date.now();
		act(() => {
			result.current.signIn(
				{ name: "T", email: "t@example.com", role: "developer" },
				ttlMs,
			);
		});

		const stored = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!);
		expect(stored.expiresAt).toBeGreaterThanOrEqual(before + ttlMs - 100);
		expect(stored.expiresAt).toBeLessThanOrEqual(before + ttlMs + 100);
	});

	it("useAuth throws when called outside of AuthProvider", () => {
		// In React 19 + RTL 14, a hook that throws during render propagates the
		// error directly from renderHook rather than landing in result.error.
		expect(() => renderHook(() => useAuth())).toThrow(
			/AuthProvider/,
		);
	});

	it("signOut clears the mux_auth_session cookie", async () => {
		const record = {
			user: { name: "Jane", email: "jane@example.com", role: "admin" },
			expiresAt: Date.now() + 60_000,
		};
		sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(record));

		const { result } = renderHook(() => useAuth(), { wrapper });
		await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

		act(() => {
			result.current.signOut();
		});

		// Cookie max-age=0 removes it; jsdom represents it as an empty value
		expect(document.cookie).not.toMatch(new RegExp(`${SESSION_COOKIE_NAME}=1`));
	});

	it("isAuthenticated reflects signIn/signOut transitions", async () => {
		const { result } = renderHook(() => useAuth(), { wrapper });
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.isAuthenticated).toBe(false);

		act(() => {
			result.current.signIn({ name: "A", email: "a@b.com", role: "developer" });
		});
		expect(result.current.isAuthenticated).toBe(true);

		act(() => {
			result.current.signOut();
		});
		expect(result.current.isAuthenticated).toBe(false);
	});
});
