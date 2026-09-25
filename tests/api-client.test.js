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

// Envelope parsing invariants for the API client. The client must unwrap
// the `{ data, error, requestId }` envelope, surface stable error codes,
// propagate correlation ids, and fail closed on malformed/adversarial
// responses instead of silently succeeding.
const {
	parseEnvelope,
	ApiError,
	STABLE_ERROR_CODES,
} = require("../src/lib/api");

// Successful unwrap: data is returned and the correlation id is exposed.
const okEnvelope = parseEnvelope({
	status: 200,
	body: { data: { walletId: "w-1" }, error: null, requestId: "req-abc-1" },
});
assert.deepStrictEqual(okEnvelope.data, { walletId: "w-1" });
assert.strictEqual(okEnvelope.requestId, "req-abc-1");
assert.strictEqual(okEnvelope.error, null);

// Correlation id propagation: the request id from the envelope is surfaced
// on the parsed result so callers can log/trace without leaking secrets.
const correlated = parseEnvelope({
	status: 200,
	body: { data: { ok: true }, error: null, requestId: "req-trace-42" },
});
assert.strictEqual(correlated.requestId, "req-trace-42");

// Stable error codes: a well-formed error envelope maps to a typed error
// carrying the stable code and the correlation id.
const errEnvelope = parseEnvelope({
	status: 403,
	body: {
		data: null,
		error: { code: "FORBIDDEN", message: "not allowed" },
		requestId: "req-err-7",
	},
});
assert.strictEqual(errEnvelope.error.code, "FORBIDDEN");
assert.strictEqual(errEnvelope.requestId, "req-err-7");
assert.ok(STABLE_ERROR_CODES.includes("FORBIDDEN"));

// Auth negatives: missing/invalid/expired credentials and wrong role must
// surface as stable, non-success errors so envelope manipulation cannot
// bypass policy.
for (const code of ["UNAUTHORIZED", "TOKEN_EXPIRED", "FORBIDDEN"]) {
	const denied = parseEnvelope({
		status: code === "FORBIDDEN" ? 403 : 401,
		body: { data: null, error: { code, message: code }, requestId: "req-auth-1" },
	});
	assert.strictEqual(denied.error.code, code);
	assert.strictEqual(denied.data, null);
	assert.ok(STABLE_ERROR_CODES.includes(code));
}

// Adversarial/malformed input must fail closed: non-JSON bodies, missing or
// extra envelope fields, oversized payloads, and unexpected status codes
// must never be treated as success.
const malformedCases = [
	{ status: 200, body: "not-json" },
	{ status: 200, body: null },
	{ status: 200, body: { data: { ok: true } } },
	{ status: 200, body: { data: { ok: true }, error: null } },
	{ status: 200, body: { data: { ok: true }, error: null, requestId: "req-1", extra: true } },
	{ status: 200, body: { data: "x".repeat(1024 * 1024 + 1), error: null, requestId: "req-1" } },
	{ status: 500, body: { data: { ok: true }, error: null, requestId: "req-1" } },
	{ status: 0, body: { data: { ok: true }, error: null, requestId: "req-1" } },
];

for (const testCase of malformedCases) {
	assert.throws(
		() => parseEnvelope(testCase),
		(err) => err instanceof ApiError,
		`malformed envelope must fail closed: ${JSON.stringify(testCase).slice(0, 80)}`,
	);
}

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
