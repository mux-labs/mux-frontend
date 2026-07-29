/**
 * Session storage utility.
 *
 * Stores session tokens in `sessionStorage` rather than `localStorage` for
 * improved security.  `sessionStorage` is scoped to the current tab and is
 * automatically cleared when the tab closes, reducing the exposure window
 * for XSS-based token theft compared to `localStorage` which persists
 * across sessions.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
 */

const STORAGE_KEY = "mux-auth-session";

/**
 * In-memory fallback store for SSR and Node.js test environments.
 * Must be a module-level singleton so save/load calls share the same store.
 */
const _memStore = {};

/**
 * Returns the session storage backend (sessionStorage for browsers,
 * in-memory fallback for SSR / test environments).
 */
function getStorage() {
	if (typeof window !== "undefined" && window.sessionStorage) {
		return window.sessionStorage;
	}
	// In-memory fallback for SSR and Node.js test environments
	return {
		getItem(key) {
			return Object.prototype.hasOwnProperty.call(_memStore, key)
				? _memStore[key]
				: null;
		},
		setItem(key, value) {
			_memStore[key] = value;
		},
		removeItem(key) {
			delete _memStore[key];
		},
	};
}

function parseSession(raw) {
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function saveSession(session) {
	if (typeof window === "undefined") return;

	const storage = getStorage();
	if (session) {
		storage.setItem(STORAGE_KEY, JSON.stringify(session));
	} else {
		storage.removeItem(STORAGE_KEY);
	}
}

function loadSession() {
	if (typeof window === "undefined") return null;

	const storage = getStorage();
	const raw = storage.getItem(STORAGE_KEY);
	if (!raw) return null;

	const session = parseSession(raw);
	if (!session || typeof session !== "object") {
		storage.removeItem(STORAGE_KEY);
		return null;
	}

	return session;
}

function clearSession() {
	saveSession(null);
}

function isSessionValid(session) {
	return (
		!!session &&
		typeof session.expiresAt === "number" &&
		Date.now() < session.expiresAt
	);
}

function createDemoSession() {
	return {
		accessToken: "mock-access-token",
		refreshToken: "mock-refresh-token",
		expiresAt: Date.now() + 30_000,
	};
}

function createExpiredDemoSession() {
	return {
		accessToken: "expired-token",
		refreshToken: "mock-refresh-token",
		expiresAt: Date.now() - 5_000,
	};
}

module.exports = {
	STORAGE_KEY,
	loadSession,
	saveSession,
	clearSession,
	isSessionValid,
	createDemoSession,
	createExpiredDemoSession,
};
