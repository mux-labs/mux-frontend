// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	MOCK_AUDIT_ENTRIES,
	MOCK_AUDIT_ENTRY_COUNT,
} from "@/lib/audit/mock-entries";
import { AUDIT_ERROR_CODES } from "@/lib/audit/pagination";

type Handler = (request: Request) => Promise<Response>;

async function loadGet(): Promise<Handler> {
	vi.resetModules();
	return (await import("./route")).GET as Handler;
}

async function loadIsMockFallbackAllowed(): Promise<
	(env: Record<string, string | undefined>) => boolean
> {
	vi.resetModules();
	return (await import("./route")).isMockFallbackAllowedFor;
}

function activityRequest(
	query = "",
	headers: Record<string, string> = { authorization: "Bearer test-token" },
): Request {
	return new Request(`http://localhost:3000/api/activity${query}`, { headers });
}

async function json(response: Response) {
	return (await response.json()) as {
		items?: { id: string }[];
		nextCursor: string | null;
		hasMore: boolean;
		correlationId?: string;
		error?: { code: string; correlationId?: string };
	};
}

const upstream = vi.fn<typeof fetch>();

beforeEach(() => {
	for (const name of [
		"MUX_BACKEND_URL",
		"NEXT_PUBLIC_API_URL",
		"NEXT_PUBLIC_MUX_API_URL",
		"NEXT_PUBLIC_API_BASE",
		"MUX_STELLAR_NETWORK",
		"NEXT_PUBLIC_STELLAR_NETWORK",
	]) {
		vi.stubEnv(name, "");
	}
	vi.stubEnv("NODE_ENV", "test");
	vi.stubEnv("MUX_STELLAR_NETWORK", "testnet");
	vi.stubGlobal("fetch", upstream);
	vi.spyOn(console, "info").mockImplementation(() => undefined);
	upstream.mockReset();
	backendUrlMocks.getBackendBaseUrl.mockReset();
	backendUrlMocks.getBackendBaseUrl.mockImplementation(
		(env: Record<string, string | undefined> = process.env) => {
			const value = env.MUX_BACKEND_URL?.trim();
			return value ? value.replace(/\/+$/, "") : null;
		},
	);
	backendUrlMocks.isMockFallbackAllowed.mockReset();
	backendUrlMocks.isMockFallbackAllowed.mockImplementation(
		(env: Record<string, string | undefined> = process.env) => {
			if (env.NODE_ENV === "production") return false;
			const network = (
				env.MUX_STELLAR_NETWORK ?? env.NEXT_PUBLIC_STELLAR_NETWORK
			)
				?.trim()
				.toLowerCase();
			return network === "testnet" || network === "futurenet";
		},
	);
});

afterEach(() => {
	vi.doUnmock("@/lib/http/backend-url");
	vi.doUnmock("@/lib/http/rate-limiter");
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("GET /api/activity — authz and validation", () => {
	it("rejects anonymous requests", async () => {
		const GET = await loadGet();
		const res = await GET(activityRequest("", {}));
		expect(res.status).toBe(401);
		expect((await json(res)).error?.code).toBe("unauthorized");
	});

	it.each([
		["?limit=500", "invalid_filter"],
		["?limit=1&limit=2", "invalid_filter"],
		["?from=2026-02-01&to=2026-01-01", "invalid_filter"],
		["?cursor=%2F%2F", "invalid_cursor"],
		["?cursor=AAAA", "invalid_cursor"],
	])("rejects %s with %s", async (query, code) => {
		const GET = await loadGet();
		const res = await GET(activityRequest(query));
		expect(res.status).toBe(400);
		expect((await json(res)).error?.code).toBe(code);
	});

	it("rate-limits per caller", async () => {
		const GET = await loadGet();
		let last: Response | null = null;
		for (let i = 0; i < 61; i += 1)
			last = await GET(activityRequest("?limit=1"));
		expect(last?.status).toBe(429);
		expect(Number(last?.headers.get("retry-after"))).toBeGreaterThan(0);
	});
});

describe("GET /api/activity — mock fallback pagination", () => {
	it("walks every fixture entry exactly once via nextCursor", async () => {
		const GET = await loadGet();
		const ids: string[] = [];
		let cursor: string | null = null;
		do {
			const query: string = cursor ? `?limit=40&cursor=${cursor}` : "?limit=40";
			const res = await GET(activityRequest(query));
			expect(res.status).toBe(200);
			expect(res.headers.get("cache-control")).toBe("no-store");
			const body = await json(res);
			ids.push(...(body.items ?? []).map((item) => item.id));
			cursor = body.nextCursor;
		} while (cursor);
		expect(ids).toHaveLength(MOCK_AUDIT_ENTRY_COUNT);
		expect(new Set(ids).size).toBe(MOCK_AUDIT_ENTRY_COUNT);
	});

	it("serves the mock fixture when allowed (NODE_ENV=test, no backend)", async () => {
		backendUrlMocks.getBackendBaseUrl.mockReturnValue(null);
		backendUrlMocks.isMockFallbackAllowed.mockReturnValue(true);
		const GET = await loadGet();
		const res = await GET(activityRequest("?limit=10"));
		expect(res.status).toBe(200);
		expect(res.headers.get("cache-control")).toBe("no-store");
		const body = await json(res);
		expect(body.items?.length).toBeGreaterThan(0);
		const fixtureIds = new Set(MOCK_AUDIT_ENTRIES.map((entry) => entry.id));
		for (const item of body.items ?? []) expect(fixtureIds.has(item.id)).toBe(true);
	});

	it("returns backend_unavailable without items when fallback is denied", async () => {
		backendUrlMocks.getBackendBaseUrl.mockReturnValue(null);
		backendUrlMocks.isMockFallbackAllowed.mockReturnValue(false);
		const GET = await loadGet();
		const res = await GET(activityRequest());
		const body = await json(res);
		expect(res.status).toBe(503);
		expect(body.error?.code).toBe(AUDIT_ERROR_CODES.BACKEND_UNAVAILABLE);
		expect(body.items).toBeUndefined();
	});

	it("rejects a cursor reused with different filters", async () => {
		const GET = await loadGet();
		const first = await json(await GET(activityRequest("?limit=5")));
		const res = await GET(
			activityRequest(`?limit=5&actor=member_admin&cursor=${first.nextCursor}`),
		);
		expect((await json(res)).error?.code).toBe("invalid_cursor");
	});

	it("never serves the mock in production", async () => {
		vi.stubEnv("NODE_ENV", "production");
		const GET = await loadGet();
		const res = await GET(activityRequest());
		expect(res.status).toBe(503);
		expect((await json(res)).error?.code).toBe("backend_unavailable");
	});

	it("never serves the testnet mock on a mainnet deploy", async () => {
		vi.stubEnv("MUX_STELLAR_NETWORK", "mainnet");
		const GET = await loadGet();
		expect((await GET(activityRequest())).status).toBe(503);
	});
});

describe("GET /api/activity — fail-closed short-circuits (#926)", () => {
	const fixtureIds = MOCK_AUDIT_ENTRIES.map((entry) => entry.id);

	// Forces the no-backend branch and pins the mock-fallback decision so the
	// guard is exercised independently of NODE_ENV / network env vars.
	function mockBackendUrl(allowMock: boolean) {
		const getBackendBaseUrl = vi.fn(() => null);
		const isMockFallbackAllowed = vi.fn(() => allowMock);
		vi.doMock("@/lib/http/backend-url", () => ({
			getBackendBaseUrl,
			isMockFallbackAllowed,
		}));
		return { getBackendBaseUrl, isMockFallbackAllowed };
	}

	it("returns 401 with UNAUTHORIZED for a credential-less request", async () => {
		const GET = await loadGet();
		const res = await GET(activityRequest("?limit=5", {}));
		expect(res.status).toBe(401);
		expect(res.headers.get("cache-control")).toBe("no-store");
		const body = await json(res);
		expect(body.error?.code).toBe(AUDIT_ERROR_CODES.UNAUTHORIZED);
		expect(body.items).toBeUndefined();
		expect(upstream).not.toHaveBeenCalled();
	});

	it("rejects an unknown authorization scheme before serving any data", async () => {
		const GET = await loadGet();
		const res = await GET(
			activityRequest("", { authorization: "Basic dXNlcjpwYXNz" }),
		);
		expect(res.status).toBe(401);
		expect((await json(res)).error?.code).toBe(AUDIT_ERROR_CODES.UNAUTHORIZED);
	});

	it("checks the credential before the rate limiter", async () => {
		const check = vi.fn(() => ({ allowed: false, retryAfterMs: 5_000 }));
		vi.doMock("@/lib/http/rate-limiter", () => ({
			callerKey: () => "caller",
			createFixedWindowLimiter: () => ({ check, reset: vi.fn() }),
		}));
		const GET = await loadGet();
		const res = await GET(activityRequest("", {}));
		expect(res.status).toBe(401);
		expect(check).not.toHaveBeenCalled();
	});

	it("returns 429 with RATE_LIMITED and a retry-after header when the limiter denies", async () => {
		vi.doMock("@/lib/http/rate-limiter", () => ({
			callerKey: () => "caller",
			createFixedWindowLimiter: () => ({
				check: () => ({ allowed: false, retryAfterMs: 12_345 }),
				reset: vi.fn(),
			}),
		}));
		const GET = await loadGet();
		const res = await GET(activityRequest("?limit=5"));
		expect(res.status).toBe(429);
		expect(res.headers.get("retry-after")).toBe("13");
		const body = await json(res);
		expect(body.error?.code).toBe(AUDIT_ERROR_CODES.RATE_LIMITED);
		expect(body.items).toBeUndefined();
		expect(upstream).not.toHaveBeenCalled();
	});

	it("returns 429 with a retry-after header once the real 60-request window is exhausted", async () => {
		const GET = await loadGet();
		for (let i = 0; i < 60; i += 1) {
			expect((await GET(activityRequest("?limit=1"))).status).toBe(200);
		}
		const res = await GET(activityRequest("?limit=1"));
		expect(res.status).toBe(429);
		expect(res.headers.get("retry-after")).not.toBeNull();
		expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
		expect((await json(res)).error?.code).toBe(AUDIT_ERROR_CODES.RATE_LIMITED);
	});

	it("returns 503 and never serves mock entries when no backend is configured and mock fallback is disallowed", async () => {
		const { getBackendBaseUrl, isMockFallbackAllowed } = mockBackendUrl(false);
		const GET = await loadGet();
		const res = await GET(activityRequest("?limit=10"));

		expect(getBackendBaseUrl).toHaveBeenCalled();
		expect(isMockFallbackAllowed).toHaveBeenCalled();
		expect(res.status).toBe(503);
		expect(res.headers.get("cache-control")).toBe("no-store");

		const text = await res.text();
		const body = JSON.parse(text) as Awaited<ReturnType<typeof json>>;
		expect(body.error?.code).toBe(AUDIT_ERROR_CODES.BACKEND_UNAVAILABLE);
		expect(body.items).toBeUndefined();
		for (const id of fixtureIds) expect(text).not.toContain(id);
		expect(upstream).not.toHaveBeenCalled();
	});

	it("returns 503 without mock entries even in a non-production env when the guard denies", async () => {
		vi.stubEnv("NODE_ENV", "development");
		mockBackendUrl(false);
		const GET = await loadGet();
		const res = await GET(activityRequest());
		expect(res.status).toBe(503);
		const text = await res.text();
		for (const id of fixtureIds) expect(text).not.toContain(id);
	});

	it.each([
		["production", { NODE_ENV: "production" }],
		["mainnet", { NEXT_PUBLIC_STELLAR_NETWORK: "mainnet" }],
		["public network", { MUX_STELLAR_NETWORK: "public" }],
	])(
		"returns 503 with no mock entry ids on a %s deploy (real guard)",
		async (_label, env) => {
			for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
			const GET = await loadGet();
			const res = await GET(activityRequest("?limit=10"));
			expect(res.status).toBe(503);
			const text = await res.text();
			expect(
				(JSON.parse(text) as { error?: { code: string } }).error?.code,
			).toBe(AUDIT_ERROR_CODES.BACKEND_UNAVAILABLE);
			for (const id of fixtureIds) expect(text).not.toContain(id);
		},
	);

	it("returns a paginated page with a correlationId when mock fallback is allowed", async () => {
		mockBackendUrl(true);
		const GET = await loadGet();
		const res = await GET(
			activityRequest("?limit=5", {
				authorization: "Bearer test-token",
				"x-correlation-id": "corr-926",
			}),
		);

		expect(res.status).toBe(200);
		expect(res.headers.get("x-correlation-id")).toBe("corr-926");
		const body = await json(res);
		expect(body.correlationId).toBe("corr-926");
		expect(body.items).toHaveLength(5);
		expect(body.hasMore).toBe(true);
		expect(typeof body.nextCursor).toBe("string");
		for (const item of body.items) expect(fixtureIds).toContain(item.id);
		expect(upstream).not.toHaveBeenCalled();
	});

	it("mints a correlationId on the mock page when none is supplied", async () => {
		mockBackendUrl(true);
		const GET = await loadGet();
		const res = await GET(activityRequest("?limit=1"));
		expect(res.status).toBe(200);
		const body = await json(res);
		expect(typeof body.correlationId).toBe("string");
		expect(body.correlationId).toBe(res.headers.get("x-correlation-id"));
	});
});

describe("isMockFallbackAllowed predicate", () => {
	it("allows test/development with no backend and an explicit non-mainnet", async () => {
		const allowed = await loadIsMockFallbackAllowed();
		expect(allowed({ NODE_ENV: "test", MUX_STELLAR_NETWORK: "testnet" })).toBe(
			true,
		);
		expect(
			allowed({ NODE_ENV: "development", MUX_STELLAR_NETWORK: "futurenet" }),
		).toBe(true);
	});

	it("denies production", async () => {
		const allowed = await loadIsMockFallbackAllowed();
		expect(allowed({ NODE_ENV: "production" })).toBe(false);
	});

	it("denies a mainnet deploy", async () => {
		const allowed = await loadIsMockFallbackAllowed();
		expect(
			allowed({ NODE_ENV: "test", NEXT_PUBLIC_STELLAR_NETWORK: "mainnet" }),
		).toBe(false);
		expect(
			allowed({ NODE_ENV: "test", MUX_STELLAR_NETWORK: "mainnet" }),
		).toBe(false);
	});

	it("denies when a backend URL is configured", async () => {
		const allowed = await loadIsMockFallbackAllowed();
		expect(
			allowed({ NODE_ENV: "test", MUX_BACKEND_URL: "https://backend.test/" }),
		).toBe(false);
	});
});

describe("GET /api/activity — backend proxy", () => {
	beforeEach(() => {
		vi.stubEnv("MUX_BACKEND_URL", "https://backend.test/");
	});

	it("forwards validated params and credentials only", async () => {
		upstream.mockResolvedValueOnce(
			Response.json({ items: [MOCK_AUDIT_ENTRIES[0]], nextCursor: "next_1" }),
		);
		const GET = await loadGet();
		const res = await GET(
			activityRequest("?actor=member_admin&limit=10&junk=1", {
				authorization: "Bearer test-token",
				"x-correlation-id": "corr-9",
				"x-role": "admin",
			}),
		);
		expect(res.status).toBe(200);
		expect(res.headers.get("x-correlation-id")).toBe("corr-9");
		const [url, init] = upstream.mock.calls[0];
		expect(url).toBe(
			"https://backend.test/activity?actor=member_admin&limit=10",
		);
		const headers = init?.headers as Record<string, string>;
		expect(headers.authorization).toBe("Bearer test-token");
		// Client-supplied role hints are never forwarded or trusted.
		expect(headers["x-role"]).toBeUndefined();
		expect((await json(res)).hasMore).toBe(true);
	});

	it.each([
		[401, {}, 401, "unauthorized"],
		[403, {}, 403, "forbidden"],
		[400, { error: { code: "invalid_cursor" } }, 400, "invalid_cursor"],
		[400, {}, 400, "invalid_filter"],
		[500, {}, 503, "backend_unavailable"],
	])("maps backend %i to %i %s", async (status, body, expected, code) => {
		upstream.mockResolvedValueOnce(Response.json(body, { status }));
		const GET = await loadGet();
		const res = await GET(activityRequest());
		expect(res.status).toBe(expected);
		expect((await json(res)).error?.code).toBe(code);
	});

	it("fails closed on a malformed upstream page", async () => {
		upstream.mockResolvedValueOnce(
			Response.json({ items: [{ id: "x" }], nextCursor: null }),
		);
		const GET = await loadGet();
		const res = await GET(activityRequest());
		const body = await json(res);
		expect(res.status).toBe(503);
		expect(body.error?.code).toBe(AUDIT_ERROR_CODES.BACKEND_UNAVAILABLE);
		expect(body.items).toBeUndefined();
	});

	it("fails closed on an upstream page larger than requested", async () => {
		upstream.mockResolvedValueOnce(
			Response.json({
				items: MOCK_AUDIT_ENTRIES.slice(0, 3),
				nextCursor: null,
			}),
		);
		const GET = await loadGet();
		expect((await GET(activityRequest("?limit=2"))).status).toBe(503);
	});

	it("propagates maintenance and Retry-After", async () => {
		upstream.mockResolvedValueOnce(
			new Response(null, {
				status: 503,
				headers: { "x-mux-maintenance": "1", "retry-after": "60" },
			}),
		);
		const GET = await loadGet();
		const res = await GET(activityRequest());
		expect(res.status).toBe(503);
		expect((await json(res)).error?.code).toBe(
			AUDIT_ERROR_CODES.BACKEND_UNAVAILABLE,
		);
		expect(res.headers.get(MAINTENANCE_HEADER)).toBe("true");
		expect(res.headers.get("retry-after")).toBe("60");
	});

	it("returns 503 when the backend is unreachable", async () => {
		upstream.mockRejectedValueOnce(new TypeError("fetch failed"));
		const GET = await loadGet();
		expect((await GET(activityRequest())).status).toBe(503);
	});

	it("logs filter keys but not filter values or credentials", async () => {
		upstream.mockResolvedValueOnce(
			Response.json({ items: [], nextCursor: null }),
		);
		const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
		const GET = await loadGet();
		await GET(activityRequest("?actor=alice%40example.com"));
		const logged = info.mock.calls.map((call) => String(call[0])).join("\n");
		expect(logged).toContain('"filterKeys":["actor"]');
		expect(logged).not.toContain("alice");
		expect(logged).not.toContain("test-token");
	});
});
