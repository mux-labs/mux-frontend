const assert = require("node:assert");

const stubStorage = (() => {
	const store = {};
	return {
		getItem(key) {
			return Object.prototype.hasOwnProperty.call(store, key)
				? store[key]
				: null;
		},
		setItem(key, value) {
			store[key] = String(value);
		},
		removeItem(key) {
			delete store[key];
		},
	};
})();

global.window = { sessionStorage: stubStorage };

const {
	loadSession,
	saveSession,
	clearSession,
	isSessionValid,
	createDemoSession,
	createExpiredDemoSession,
} = require("../src/lib/session");

const session = createDemoSession();
assert.strictEqual(loadSession(), null);

saveSession(session);
const stored = loadSession();
assert.deepStrictEqual(stored.accessToken, session.accessToken);
assert.strictEqual(isSessionValid(stored), true);

clearSession();
assert.strictEqual(loadSession(), null);

const expired = createExpiredDemoSession();
saveSession(expired);
assert.strictEqual(isSessionValid(loadSession()), false);

// --- Session handling cookie parity (#766) ---
//
// The session cookie attributes must be defined once and shared by the
// login (set) and logout (clear) code paths so that parity holds across
// environments. These invariants guard against testnet/mainnet misconfig
// and against a logout that fails to clear a cookie set at login.

const {
	SESSION_COOKIE_NAME,
	SESSION_COOKIE_ATTRIBUTES,
	buildSessionCookie,
	buildClearSessionCookie,
	parseSessionCookie,
	validateSessionCookie,
} = require("../src/lib/session-cookie");

// Single source of truth: name and attributes are stable constants.
assert.strictEqual(typeof SESSION_COOKIE_NAME, "string");
assert.ok(SESSION_COOKIE_NAME.length > 0);
assert.strictEqual(SESSION_COOKIE_ATTRIBUTES.path, "/");
assert.strictEqual(SESSION_COOKIE_ATTRIBUTES.httpOnly, true);
assert.strictEqual(SESSION_COOKIE_ATTRIBUTES.sameSite, "Lax");

// Login sets the cookie with the canonical attributes.
const setCookie = buildSessionCookie(session.accessToken, {
	expiresAt: session.expiresAt,
});
assert.ok(setCookie.startsWith(`${SESSION_COOKIE_NAME}=`));
assert.ok(setCookie.includes("Path=/"));
assert.ok(setCookie.includes("HttpOnly"));
assert.ok(setCookie.includes("SameSite=Lax"));
assert.ok(setCookie.includes("Max-Age=") || setCookie.includes("Expires="));

// Logout clears the cookie with matching attributes (parity).
const clearCookie = buildClearSessionCookie();
assert.ok(clearCookie.startsWith(`${SESSION_COOKIE_NAME}=`));
assert.ok(clearCookie.includes("Path=/"));
assert.ok(clearCookie.includes("HttpOnly"));
assert.ok(clearCookie.includes("SameSite=Lax"));
assert.ok(clearCookie.includes("Max-Age=0") || clearCookie.includes("Expires=Thu, 01 Jan 1970"));

// Secure is enforced on mainnet and omitted on testnet (misconfig guard).
const mainnetCookie = buildSessionCookie(session.accessToken, {
	expiresAt: session.expiresAt,
	secure: true,
});
assert.ok(mainnetCookie.includes("Secure"));
const testnetCookie = buildSessionCookie(session.accessToken, {
	expiresAt: session.expiresAt,
	secure: false,
});
assert.ok(!testnetCookie.includes("Secure"));

// Server-side read: parse + validate fail-closed with stable error codes.
const parsed = parseSessionCookie(setCookie);
assert.strictEqual(parsed.name, SESSION_COOKIE_NAME);
assert.strictEqual(parsed.value, session.accessToken);

const okResult = validateSessionCookie(setCookie, { now: Date.now() });
assert.strictEqual(okResult.ok, true);
assert.strictEqual(okResult.value, session.accessToken);

// Missing cookie -> rejected.
const missing = validateSessionCookie(undefined, { now: Date.now() });
assert.strictEqual(missing.ok, false);
assert.strictEqual(missing.error, "SESSION_MISSING");

// Malformed cookie -> rejected.
const malformed = validateSessionCookie("not-a-cookie", { now: Date.now() });
assert.strictEqual(malformed.ok, false);
assert.strictEqual(malformed.error, "SESSION_MALFORMED");

// Expired cookie -> rejected.
const expiredCookie = buildSessionCookie(session.accessToken, {
	expiresAt: Date.now() - 1000,
});
const expiredResult = validateSessionCookie(expiredCookie, { now: Date.now() });
assert.strictEqual(expiredResult.ok, false);
assert.strictEqual(expiredResult.error, "SESSION_EXPIRED");

// Wrong-role / revoked delegate -> rejected (deny-by-default).
const wrongRole = validateSessionCookie(setCookie, {
	now: Date.now(),
	requiredRole: "admin",
	role: "delegate",
});
assert.strictEqual(wrongRole.ok, false);
assert.strictEqual(wrongRole.error, "SESSION_FORBIDDEN");

const revoked = validateSessionCookie(setCookie, {
	now: Date.now(),
	requiredRole: "delegate",
	role: "delegate",
	revoked: true,
});
assert.strictEqual(revoked.ok, false);
assert.strictEqual(revoked.error, "SESSION_REVOKED");

// Replayed request idempotency: same cookie validates deterministically.
const replayA = validateSessionCookie(setCookie, { now: Date.now() });
const replayB = validateSessionCookie(setCookie, { now: Date.now() });
assert.deepStrictEqual(replayA, replayB);

console.log("session.test.js passed");
