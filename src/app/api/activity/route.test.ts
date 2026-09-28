// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	MOCK_AUDIT_ENTRIES,
	MOCK_AUDIT_ENTRY_COUNT,
} from "@/lib/audit/mock-entries";

type Handler = (request: Request) => Promise<Response>;

async function loadGet(): Promise<Handler> {
	vi.resetModules();
	return (await import("./route")).GET as Handler;
}

function activityRequest(
	query = "",
	headers: Record<string, string> = { authorization: "Bearer test-token" },
): Request {
	return new Request(`http://localhost:3000/api/activity${query}`, { headers });
}

async function json(response: Response) {
	return (await response.json()) as {
		items: { id: string }[];
		nextCursor: string | null;
		hasMore: boolean;
		error?: { code: string };
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
	vi.stubGlobal("fetch", upstream);
	vi.spyOn(console, "info").mockImplementation(() => undefined);
	upstream.mockReset();
});

afterEach(() => {
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
			ids.push(...body.items.map((item) => item.id));
			cursor = body.nextCursor;
		} while (cursor);
		expect(ids).toHaveLength(MOCK_AUDIT_ENTRY_COUNT);
		expect(new Set(ids).size).toBe(MOCK_AUDIT_ENTRY_COUNT);
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
		vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
		const GET = await loadGet();
		expect((await GET(activityRequest())).status).toBe(503);
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
		expect((await GET(activityRequest())).status).toBe(503);
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
		expect(res.headers.get("x-mux-maintenance")).toBe("true");
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
