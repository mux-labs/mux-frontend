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

console.log("session.test.js passed");
