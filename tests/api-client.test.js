const assert = require("node:assert");

const { requestIdHeader, refreshSession, resolveApiBaseUrl } = require("../src/lib/api");
const {
	saveSession,
	clearSession,
	createExpiredDemoSession,
} = require("../src/lib/session");

assert.match(requestIdHeader(), /^req-[a-z0-9]+-\d+$/);
assert.notStrictEqual(requestIdHeader(), requestIdHeader());

// API URL alias chain: every documented alias must resolve to the same
// canonical API base URL, and an unset/invalid base must fail closed
// instead of silently falling back to an unintended host.
const CANONICAL_API_BASE = "https://api.muxprotocol.io";
const API_URL_ALIASES = [
	"NEXT_PUBLIC_API_URL",
	"NEXT_PUBLIC_API_BASE_URL",
	"NEXT_PUBLIC_MUX_API_URL",
	"API_URL",
];

for (const alias of API_URL_ALIASES) {
	assert.strictEqual(
		resolveApiBaseUrl({ [alias]: CANONICAL_API_BASE }),
		CANONICAL_API_BASE,
		`alias ${alias} must resolve to the canonical API base URL`,
	);
}

// Precedence: the first documented alias wins when several are set.
assert.strictEqual(
	resolveApiBaseUrl({
		NEXT_PUBLIC_API_URL: CANONICAL_API_BASE,
		API_URL: "https://evil.example.com",
	}),
	CANONICAL_API_BASE,
);

// Fail-closed negatives: missing or invalid config must not silently
// fall back to an unintended host.
assert.throws(() => resolveApiBaseUrl({}), /API base URL/i);
assert.throws(
	() => resolveApiBaseUrl({ NEXT_PUBLIC_API_URL: "" }),
	/API base URL/i,
);
assert.throws(
	() => resolveApiBaseUrl({ NEXT_PUBLIC_API_URL: "not-a-url" }),
	/API base URL/i,
);
assert.throws(
	() => resolveApiBaseUrl({ NEXT_PUBLIC_API_URL: "ftp://api.muxprotocol.io" }),
	/API base URL/i,
);

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

let authRefreshCalled = false;

global.fetch = async (url, opts) => {
	if (url === "/api/auth/refresh") {
		authRefreshCalled = true;
		return {
			ok: true,
			json: async () => ({
				accessToken: "mock-access-token",
				refreshToken: "mock-refresh-token",
				expiresIn: 30,
			}),
		};
	}

	return { ok: false, status: 401, text: async () => "unauthorized" };
};

module.exports = (async () => {
	saveSession(createExpiredDemoSession());

	const refreshed = await refreshSession();
	assert.strictEqual(authRefreshCalled, true);
	assert.strictEqual(refreshed.accessToken, "mock-access-token");
	assert.strictEqual(refreshed.refreshToken, "mock-refresh-token");
	assert.strictEqual(typeof refreshed.expiresAt, "number");
	clearSession();
	console.log("api-client.test.js passed");
})();
