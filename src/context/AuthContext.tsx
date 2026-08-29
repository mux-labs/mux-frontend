"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { invalidateWalletsCache } from "@/hooks/useWallets";
import {
	clearSession as clearBearerSession,
	createSession as createBearerSession,
	saveSession as saveBearerSession,
} from "@/lib/session";
import { resetWalletsPrefetchCache } from "@/lib/walletsPrefetchCache";
import {
	trackAuthEvent,
	trackSessionExpired,
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

/**
 * Bearer-token block returned by `POST /api/auth/login` (mock mode always
 * returns one; a real backend returns one when it doesn't rely solely on the
 * HttpOnly cookie). Persisted to `sessionStorage` via `src/lib/session.js` so
 * `src/lib/api.js` can attach `Authorization` headers and refresh on 401.
 */
export interface SessionTokens {
	accessToken: string;
	refreshToken?: string;
	/** Seconds until the access token expires. */
	expiresIn?: number;
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
	 * @param tokens - Optional bearer-token block from the login response;
	 *   persisted to `sessionStorage` for `src/lib/api.js` (#628).
	 */
	signIn: (
		user: AuthUser,
		ttlMs?: number,
		tokens?: SessionTokens | null,
	) => void;
	/** Clear the session and sign the user out. */
	signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** sessionStorage key for the user record (client-side rehydration). */
export const SESSION_STORAGE_KEY = "mux_auth_user";

/**
 * Legacy client-set marker cookie (value "1").
 *
 * Since #621 this is only trusted by the middleware in **mock mode** (no
 * `NEXT_PUBLIC_API_URL` configured). When a backend is configured, route
 * protection requires the HttpOnly, backend-verified `mux_auth_token` cookie
 * set by `/api/auth/login` — see `src/lib/auth/routeAccess.ts`.
 */
export const SESSION_COOKIE_NAME = "mux_auth_session";

/** Default session lifetime: 8 hours. */
const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Cookie helpers (client-side only)
//
// CSRF / SameSite Notes:
//
// The `mux_auth_session` cookie is a lightweight marker cookie (value "1")
// used solely by the Next.js middleware for server-side route protection.
// It does NOT contain sensitive data — tokens live in `sessionStorage`.
//
// SameSite=Lax:
//   Protects against CSRF on unsafe methods (POST/PUT/DELETE) by not
//   sending the cookie on cross-site requests.  Top-level navigations
//   (e.g. clicking a link) still include the cookie so the middleware
//   can recognise authenticated users without breaking deep-links.
//
// Secure flag:
//   Added automatically whenever the page is served over HTTPS (i.e. every
//   real deployment) so the marker cookie is never transmitted in cleartext.
//   Omitted on plain-HTTP `localhost` so `pnpm dev` keeps working (#627).
//
// HttpOnly:
//   The authoritative session token is the HttpOnly, backend-verified
//   `mux_auth_token` cookie set server-side by `/api/auth/login` (see
//   `src/app/api/auth/login/route.ts`). This client-set marker cookie
//   intentionally cannot be HttpOnly and carries no secret — it only lets
//   the middleware's non-production presence check recognise a session.
//
// Path=/ restricts the cookie to all paths; no Domain attribute means
// it is host-only (not sent to subdomains), which is the most restrictive
// and safest default.
// ---------------------------------------------------------------------------

/** True when the current page is served over HTTPS (so `; Secure` is safe). */
function isSecureContext(): boolean {
	return (
		typeof window !== "undefined" && window.location?.protocol === "https:"
	);
}

function setSessionCookie(ttlMs: number): void {
	const maxAge = Math.floor(ttlMs / 1000);
	// SameSite=Lax is safe for same-origin navigation; `; Secure` is appended
	// on HTTPS so production never sends the cookie over cleartext, while
	// plain-HTTP localhost still works. See the CSRF / SameSite notes above.
	const secure = isSecureContext() ? "; Secure" : "";
	document.cookie = `${SESSION_COOKIE_NAME}=1; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

function clearSessionCookie(): void {
	const secure = isSecureContext() ? "; Secure" : "";
	document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax${secure}`;
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

	const signIn = useCallback(
		(
			authUser: AuthUser,
			ttlMs = DEFAULT_TTL_MS,
			tokens?: SessionTokens | null,
		) => {
			const record: SessionRecord = {
				user: authUser,
				expiresAt: Date.now() + ttlMs,
			};
			sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(record));
			setSessionCookie(ttlMs);

			// Persist bearer tokens for `src/lib/api.js` (#628). When the login
			// response carries no token block (e.g. a backend that relies solely
			// on the HttpOnly cookie), `createBearerSession` returns null and we
			// simply skip this — `apiFetch` then falls back to cookie auth.
			const bearerSession = createBearerSession(tokens ?? undefined);
			if (bearerSession) {
				saveBearerSession(bearerSession);
			}

			setUser(authUser);
		},
		[],
	);

	const signOut = useCallback(() => {
		const currentUser = user;
		sessionStorage.removeItem(SESSION_STORAGE_KEY);
		clearSessionCookie();
		// Drop the bearer-token session used by `src/lib/api.js` (#628).
		clearBearerSession();
		// The backend-issued `mux_auth_token` cookie is HttpOnly, so it can only
		// be cleared server-side (#621). Fire-and-forget — the client-side
		// cleanup below stands regardless of whether this request succeeds.
		try {
			void fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
		} catch {
			// `fetch` unavailable (e.g. some non-browser test envs) — ignore.
		}
		// Drop cached wallet data so the next session (or a different user on
		// the same device) never sees a stale, pre-logout list before refetching.
		invalidateWalletsCache();
		resetWalletsPrefetchCache();
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
