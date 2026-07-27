const assert = require("node:assert");

const { requestIdHeader, refreshSession } = require("../src/lib/api");
const {
	saveSession,
	clearSession,
	createExpiredDemoSession,
} = require("../src/lib/session");

assert.match(requestIdHeader(), /^req-[a-z0-9]+-\d+$/);
assert.notStrictEqual(requestIdHeader(), requestIdHeader());

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
