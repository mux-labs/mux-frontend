"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { 
	trackAuthEvent, 
	trackSessionExpired 
} from "@/services/authAnalyticsTracking";

export interface AuthUser {
	/** The user's display name */
	name: string;
	/** The user's email address */
	email: string;
	/** The user's role, e.g. "admin" or "developer" */
	role: string;
}

/** Shape of a persisted session record. */
interface SessionRecord {
	user: AuthUser;
	/** Unix timestamp (ms) when the session expires. */
	expiresAt: number;
}

interface AuthContextValue {
	/** The currently authenticated user, or null if not signed in. */
	user: AuthUser | null;
	/** True while the session is being rehydrated from storage on mount. */
	isLoading: boolean;
	/** True when a valid, non-expired session exists. */
	isAuthenticated: boolean;
	/**
	 * Persist the authenticated user and start a session.
	 * @param user - The authenticated user object returned by the API.
	 * @param ttlMs - Session lifetime in milliseconds. Defaults to 8 hours.
	 */
	signIn: (user: AuthUser, ttlMs?: number) => void;
	/** Clear the session and sign the user out. */
	signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** sessionStorage key for the user record (client-side rehydration). */
export const SESSION_STORAGE_KEY = "mux_auth_user";

/** Cookie name read by the Next.js middleware for server-side route protection. */
export const SESSION_COOKIE_NAME = "mux_auth_session";

/** Default session lifetime: 8 hours. */
const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Cookie helpers (client-side only)
// ---------------------------------------------------------------------------

function setSessionCookie(ttlMs: number): void {
	const maxAge = Math.floor(ttlMs / 1000);
	// SameSite=Lax is safe for same-origin navigation; Secure is omitted here
	// so it works on localhost — add "; Secure" in production via a server-set cookie.
	document.cookie = `${SESSION_COOKIE_NAME}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearSessionCookie(): void {
	document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Provides authentication state and actions to the component tree.
 *
 * On mount it rehydrates the session from `sessionStorage` and validates the
 * expiry timestamp. Place this at the root of the application so all
 * descendants can call `useAuth()`.
 *
 * @example
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	/** Rehydrate session from sessionStorage on mount and validate expiry. */
	useEffect(() => {
		try {
			const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
			if (stored) {
				const record = JSON.parse(stored) as SessionRecord;
				if (record.expiresAt > Date.now()) {
					setUser(record.user);
					// Re-sync cookie in case it was cleared (e.g. browser restart)
					const remainingMs = record.expiresAt - Date.now();
					setSessionCookie(remainingMs);
					trackAuthEvent("session_rehydrated", { 
						email: record.user.email,
						remainingMs,
					});
				} else {
					// Session expired — clean up stale data
					sessionStorage.removeItem(SESSION_STORAGE_KEY);
					clearSessionCookie();
					trackSessionExpired();
				}
			}
		} catch {
			// Corrupt storage — treat as unauthenticated
			sessionStorage.removeItem(SESSION_STORAGE_KEY);
			clearSessionCookie();
		} finally {
			setIsLoading(false);
		}
	}, []);

	const signIn = useCallback((authUser: AuthUser, ttlMs = DEFAULT_TTL_MS) => {
		const record: SessionRecord = {
			user: authUser,
			expiresAt: Date.now() + ttlMs,
		};
		sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(record));
		setSessionCookie(ttlMs);
		setUser(authUser);
	}, []);

	const signOut = useCallback(() => {
		const currentUser = user;
		sessionStorage.removeItem(SESSION_STORAGE_KEY);
		clearSessionCookie();
		setUser(null);
		trackAuthEvent("logout", { 
			email: currentUser?.email,
		});
	}, [user]);

	return (
		<AuthContext.Provider
			value={{
				user,
				isLoading,
				isAuthenticated: user !== null,
				signIn,
				signOut,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

/**
 * Alias exported for issue #40 — "Integrate session provider".
 * Consumers can import either `AuthProvider` or `SessionProvider`; they are
 * the same component.
 */
export const SessionProvider = AuthProvider;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the current auth context value.
 *
 * Must be called inside an `AuthProvider` (or its `SessionProvider` alias).
 * Throws if used outside of the provider.
 *
 * @returns `{ user, isLoading, isAuthenticated, signIn, signOut }`
 *
 * @example
 * ```tsx
 * const { user, signOut } = useAuth();
 * ```
 */
export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) {
		throw new Error(
			"useAuth must be used within an AuthProvider / SessionProvider",
		);
	}
	return ctx;
}

/** Convenience alias for `useAuth`. */
export const useSession = useAuth;
