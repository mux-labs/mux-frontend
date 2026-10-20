import { describe, expect, it } from "vitest";
import { MOCK_AUDIT_ENTRIES, MOCK_AUDIT_ENTRY_COUNT } from "./mock-entries";
import {
	type AuditEntry,
	type AuditPageQuery,
	DEFAULT_AUDIT_PAGE_SIZE,
	MAX_AUDIT_PAGE_SIZE,
	MAX_AUDIT_RANGE_DAYS,
	MAX_CURSOR_LENGTH,
	decodeAuditCursor,
	encodeAuditCursor,
	paginateAuditEntries,
	parseAuditPage,
	parseAuditPageParams,
	toAuditSearchParams,
} from "./pagination";
import {
	auditPaginationReducer,
	canLoadMore,
	initialAuditPaginationState,
} from "./pagination-state";

function parse(query: string) {
	return parseAuditPageParams(new URLSearchParams(query));
}

function collectAll(entries: readonly AuditEntry[], query: AuditPageQuery) {
	const seen: AuditEntry[] = [];
	let cursor: string | null = null;
	for (let guard = 0; guard < 1_000; guard += 1) {
		const result = paginateAuditEntries(entries, { ...query, cursor });
		if (!result.ok) throw new Error(result.code);
		seen.push(...result.page.items);
		cursor = result.page.nextCursor;
		if (cursor === null) return seen;
	}
	throw new Error("pagination did not terminate");
}

describe("parseAuditPageParams", () => {
	it("applies defaults and ignores unknown params", () => {
		expect(parse("foo=bar")).toEqual({
			ok: true,
			query: { filters: {}, cursor: null, limit: 50 },
		});
	});

	it("returns the documented defaults for a completely empty query (issue #958)", () => {
		expect(parse("")).toEqual({
			ok: true,
			query: { filters: {}, cursor: null, limit: DEFAULT_AUDIT_PAGE_SIZE },
		});
	});

	// #958: the parser only ever reads named params off a hardcoded allow-list
	// (PAGE_PARAMS / the `["actor","action"]` / `["from","to"]` loops), so a
	// `__proto__`/`constructor` key can never be used to set a property on the
	// returned `filters`/`query` objects. This pins that down so a future
	// refactor to a dynamic `for (const key of params.keys())` loop would be
	// caught here rather than silently reintroducing prototype pollution.
	it("ignores __proto__ and constructor query keys without polluting the result", () => {
		const result = parse("__proto__=evil&constructor=evil&actor=member_admin");
		expect(result).toEqual({
			ok: true,
			query: { filters: { actor: "member_admin" }, cursor: null, limit: 50 },
		});
		if (!result.ok) throw new Error("expected ok");
		expect(Object.getPrototypeOf(result.query.filters)).toBe(Object.prototype);
		expect(Object.getPrototypeOf({})).toBe(Object.prototype);
	});

	it("normalises valid filters", () => {
		const result = parse(
			"actor=member_admin&action=wallet.send&from=2026-01-01&to=2026-01-02T00:00:00Z&limit=10",
		);
		expect(result).toEqual({
			ok: true,
			query: {
				filters: {
					actor: "member_admin",
					action: "wallet.send",
					from: "2026-01-01T00:00:00.000Z",
					to: "2026-01-02T00:00:00.000Z",
				},
				cursor: null,
				limit: 10,
			},
		});
	});

	it.each([
		["limit=0", "limit"],
		["limit=101", "limit"],
		["limit=1.5", "limit"],
		["limit=10&limit=100", "limit"],
		["actor=", "actor"],
		["actor=a%20b", "actor"],
		[`action=${"a".repeat(129)}`, "action"],
		["from=yesterday", "from"],
		["from=2026-13-40", "from"],
		["from=2026-02-01&to=2026-01-01", "from"],
		["from=2024-01-01&to=2026-01-01", "to"],
	])("rejects %s as invalid_filter", (query, field) => {
		expect(parse(query)).toEqual({ ok: false, code: "invalid_filter", field });
	});

	it("rejects malformed and oversized cursors as invalid_cursor", () => {
		expect(parse("cursor=not%2Fbase64").ok).toBe(false);
		expect(parse(`cursor=${"a".repeat(513)}`)).toEqual({
			ok: false,
			code: "invalid_cursor",
			field: "cursor",
		});
	});

	it("round-trips through toAuditSearchParams", () => {
		const result = parse("actor=member_admin&limit=5&cursor=abc");
		if (!result.ok) throw new Error("expected ok");
		expect(parseAuditPageParams(toAuditSearchParams(result.query))).toEqual(
			result,
		);
	});
});

describe("parseAuditPageParams rejection branches", () => {
	const DAY_MS = 24 * 60 * 60 * 1000;

	function expectRejected(
		query: string,
		field: string,
		code: "invalid_filter" | "invalid_cursor" = "invalid_filter",
	) {
		const result = parse(query);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.code).toBe(code);
		expect(result.field).toBe(field);
	}

	describe("parameter pollution", () => {
		// Each value is valid on its own, so only the duplication can reject.
		it.each([
			["actor", "actor=a&actor=b"],
			["action", "action=wallet.send&action=wallet.send"],
			["from", "from=2026-01-01&from=2026-01-02"],
			["to", "to=2026-01-01&to=2026-01-02"],
			["cursor", "cursor=abc&cursor=def"],
			["limit", "limit=1&limit=100"],
		])("rejects a duplicated %s", (field, query) => {
			expect(new URLSearchParams(query).getAll(field)).toHaveLength(2);
			expectRejected(query, field);
		});

		it("rejects a duplicate even when the copies are identical or empty", () => {
			expectRejected("limit=10&limit=10", "limit");
			expectRejected("actor=&actor=", "actor");
		});
	});

	describe("actor/action tokens", () => {
		it.each([
			["actor", "actor="],
			["actor", "actor=a%09b"],
			["actor", "actor=a%00b"],
			["action", "action=wallet%7Fsend"],
			["action", "action=wallet%0Asend"],
			["action", `action=${"a".repeat(129)}`],
		])("rejects a non-token %s (%s)", (field, query) => {
			expectRejected(query, field);
		});

		it("accepts a 128-character token", () => {
			const actor = "a".repeat(128);
			expect(parse(`actor=${actor}`)).toMatchObject({
				ok: true,
				query: { filters: { actor } },
			});
		});
	});

	describe("from/to dates", () => {
		it.each([
			["from", "from=yesterday"],
			["from", "from=01%2F02%2F2026"],
			["from", "from=2026-1-01"],
			["from", "from=2026-01-01T10%3A00"],
			["to", "to=2026-01-01%2000%3A00%3A00Z"],
			["to", "to="],
		])("rejects malformed %s (%s)", (field, query) => {
			expectRejected(query, field);
		});

		it.each([
			["from", "from=2026-13-01"],
			["from", "from=2026-00-10"],
			["to", "to=2026-01-01T25%3A00Z"],
			["to", "to=2026-01-01T00%3A61Z"],
		])("rejects ISO-shaped but unparseable %s (%s)", (field, query) => {
			expectRejected(query, field);
		});

		it("rejects an inverted range on the from field", () => {
			expectRejected(
				"from=2026-02-01T00%3A00%3A00Z&to=2026-01-31T23%3A59%3A59Z",
				"from",
			);
		});

		it("accepts date-only bounds on the same day", () => {
			expect(parse("from=2026-01-01&to=2026-01-01")).toMatchObject({
				ok: true,
				query: {
					filters: {
						from: "2026-01-01T00:00:00.000Z",
						to: "2026-01-01T00:00:00.000Z",
					},
				},
			});
		});

		it("accepts offset-bearing bounds that are forward after UTC normalization", () => {
			expect(
				parse(
					"from=2024-01-01T23%3A00%3A00%2B02%3A00&to=2024-01-02T00%3A00%3A00Z",
				),
			).toMatchObject({
				ok: true,
				query: {
					filters: {
						from: "2024-01-01T21:00:00.000Z",
						to: "2024-01-02T00:00:00.000Z",
					},
				},
			});
		});

		it("rejects a genuinely inverted offset-bearing pair on from", () => {
			expectRejected(
				"from=2024-01-02T01%3A00%3A00%2B01%3A00&to=2024-01-01T23%3A59%3A59Z",
				"from",
			);
		});

		it(`accepts a range of exactly ${MAX_AUDIT_RANGE_DAYS} days`, () => {
			const from = "2025-01-01T00:00:00.000Z";
			const to = new Date(
				Date.parse(from) + MAX_AUDIT_RANGE_DAYS * DAY_MS,
			).toISOString();
			expect(
				parse(new URLSearchParams({ from, to }).toString()),
			).toMatchObject({ ok: true, query: { filters: { from, to } } });
		});

		it(`rejects a range one day over ${MAX_AUDIT_RANGE_DAYS} days`, () => {
			const from = "2025-01-01T00:00:00.000Z";
			const to = new Date(
				Date.parse(from) + (MAX_AUDIT_RANGE_DAYS + 1) * DAY_MS,
			).toISOString();
			expectRejected(new URLSearchParams({ from, to }).toString(), "to");
		});
	});

	describe("limit", () => {
		it("defaults when absent", () => {
			const result = parse("actor=a");
			expect(result).toMatchObject({
				ok: true,
				query: { limit: DEFAULT_AUDIT_PAGE_SIZE },
			});
		});

		it.each(["", "abc", "-1", "1e2", "0x10", "%205", "1000"])(
			"rejects non-numeric limit %j",
			(raw) => {
				expectRejected(`limit=${raw}`, "limit");
			},
		);

		it.each(["0", "000", String(MAX_AUDIT_PAGE_SIZE + 1), "999"])(
			"rejects out-of-range limit %s",
			(raw) => {
				expectRejected(`limit=${raw}`, "limit");
			},
		);

		it.each([1, MAX_AUDIT_PAGE_SIZE])("accepts limit %i", (limit) => {
			expect(parse(`limit=${limit}`)).toMatchObject({
				ok: true,
				query: { limit },
			});
		});
	});

	describe("cursor", () => {
		it("defaults to null when absent", () => {
			expect(parse("limit=5")).toMatchObject({
				ok: true,
				query: { cursor: null },
			});
		});

		it(`rejects a cursor longer than ${MAX_CURSOR_LENGTH} characters`, () => {
			expectRejected(
				`cursor=${"a".repeat(MAX_CURSOR_LENGTH + 1)}`,
				"cursor",
				"invalid_cursor",
			);
		});

		it(`accepts a cursor of exactly ${MAX_CURSOR_LENGTH} characters`, () => {
			const cursor = "a".repeat(MAX_CURSOR_LENGTH);
			expect(parse(`cursor=${cursor}`)).toMatchObject({
				ok: true,
				query: { cursor },
			});
		});

		it.each(["abc+def", "abc/def", "abc=", "abc.def", "abc def", ""])(
			"rejects non-base64url cursor %j",
			(cursor) => {
				expectRejected(
					`cursor=${encodeURIComponent(cursor)}`,
					"cursor",
					"invalid_cursor",
				);
			},
		);
	});
});

describe("toAuditSearchParams", () => {
	it("round-trips a fully populated valid query", () => {
		const result = parse(
			"actor=member_admin&action=wallet.send&from=2026-01-01&to=2026-02-01T12%3A30%3A00%2B01%3A00&cursor=eyJ2IjoxfQ&limit=25",
		);
		if (!result.ok) throw new Error("expected ok");

		const params = toAuditSearchParams(result.query);
		expect(Object.fromEntries(params)).toEqual({
			actor: "member_admin",
			action: "wallet.send",
			from: "2026-01-01T00:00:00.000Z",
			to: "2026-02-01T11:30:00.000Z",
			cursor: "eyJ2IjoxfQ",
			limit: "25",
		});
		expect(parseAuditPageParams(params)).toEqual(result);
	});

	it("omits absent filters and cursor but always serializes the limit", () => {
		const query: AuditPageQuery = {
			filters: {},
			cursor: null,
			limit: DEFAULT_AUDIT_PAGE_SIZE,
		};
		const params = toAuditSearchParams(query);
		expect(Object.fromEntries(params)).toEqual({
			limit: String(DEFAULT_AUDIT_PAGE_SIZE),
		});
		expect(parseAuditPageParams(params)).toEqual({ ok: true, query });
	});
});

describe("audit cursors", () => {
	const key = { createdAt: "2026-01-01T00:00:00.000Z", id: "evt_0001" };

	it("decodes a cursor issued for the same filters", () => {
		const cursor = encodeAuditCursor(key, { actor: "a" });
		expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(decodeAuditCursor(cursor, { actor: "a" })).toEqual(key);
	});

	it("rejects a cursor replayed against different filters", () => {
		const cursor = encodeAuditCursor(key, { actor: "a" });
		expect(decodeAuditCursor(cursor, {})).toBeNull();
		expect(decodeAuditCursor(cursor, { actor: "b" })).toBeNull();
	});

	it("rejects forged cursors", () => {
		expect(decodeAuditCursor("AAAA", {})).toBeNull();
		expect(decodeAuditCursor(btoa('{"v":2}'), {})).toBeNull();
	});
});

describe("paginateAuditEntries", () => {
	const firstPage = { filters: {}, cursor: null, limit: 25 };

	it("walks every entry exactly once in (createdAt, id) desc order", () => {
		const all = collectAll(MOCK_AUDIT_ENTRIES, firstPage);
		expect(all).toHaveLength(MOCK_AUDIT_ENTRY_COUNT);
		expect(new Set(all.map((e) => e.id)).size).toBe(MOCK_AUDIT_ENTRY_COUNT);
		for (let i = 1; i < all.length; i += 1) {
			const prev = Date.parse(all[i - 1].createdAt);
			const cur = Date.parse(all[i].createdAt);
			expect(prev > cur || (prev === cur && all[i - 1].id > all[i].id)).toBe(
				true,
			);
		}
	});

	it("keeps page boundaries stable when rows share a timestamp", () => {
		// limit=1 forces a boundary between every tie pair in the fixture.
		const all = collectAll(MOCK_AUDIT_ENTRIES, { ...firstPage, limit: 1 });
		expect(all).toHaveLength(MOCK_AUDIT_ENTRY_COUNT);
	});

	it("does not duplicate or skip when newer rows are inserted mid-walk", () => {
		const page1 = paginateAuditEntries(MOCK_AUDIT_ENTRIES, firstPage);
		if (!page1.ok) throw new Error("expected ok");
		const newer: AuditEntry = {
			id: "evt_new",
			actor: "member_admin",
			action: "wallet.send",
			createdAt: "2030-01-01T00:00:00.000Z",
			network: "testnet",
		};
		const page2 = paginateAuditEntries([...MOCK_AUDIT_ENTRIES, newer], {
			...firstPage,
			cursor: page1.page.nextCursor,
		});
		if (!page2.ok) throw new Error("expected ok");
		const ids = new Set(page1.page.items.map((e) => e.id));
		expect(page2.page.items.some((e) => ids.has(e.id))).toBe(false);
		expect(page2.page.items.some((e) => e.id === "evt_new")).toBe(false);
	});

	it("is idempotent: replaying a cursor returns the same page", () => {
		const page1 = paginateAuditEntries(MOCK_AUDIT_ENTRIES, firstPage);
		if (!page1.ok) throw new Error("expected ok");
		const query = { ...firstPage, cursor: page1.page.nextCursor };
		expect(paginateAuditEntries(MOCK_AUDIT_ENTRIES, query)).toEqual(
			paginateAuditEntries(MOCK_AUDIT_ENTRIES, query),
		);
	});

	it("applies filters before paginating", () => {
		const all = collectAll(MOCK_AUDIT_ENTRIES, {
			filters: { action: "wallet.send" },
			cursor: null,
			limit: 7,
		});
		expect(all.length).toBeGreaterThan(0);
		expect(all.every((e) => e.action === "wallet.send")).toBe(true);
	});

	it("rejects a cursor from another filter set", () => {
		const page1 = paginateAuditEntries(MOCK_AUDIT_ENTRIES, {
			...firstPage,
			filters: { actor: "member_admin" },
		});
		if (!page1.ok) throw new Error("expected ok");
		expect(
			paginateAuditEntries(MOCK_AUDIT_ENTRIES, {
				...firstPage,
				cursor: page1.page.nextCursor,
			}),
		).toEqual({ ok: false, code: "invalid_cursor" });
	});

	it("returns an empty, exhausted page for no matches", () => {
		expect(
			paginateAuditEntries(MOCK_AUDIT_ENTRIES, {
				...firstPage,
				filters: { actor: "nobody" },
			}),
		).toEqual({
			ok: true,
			page: { items: [], hasMore: false, nextCursor: null },
		});
	});
});

describe("parseAuditPage", () => {
	const entry = MOCK_AUDIT_ENTRIES[0];

	it("accepts a well-formed page", () => {
		expect(parseAuditPage({ items: [entry], nextCursor: "abc" }, 10)).toEqual({
			items: [entry],
			nextCursor: "abc",
			hasMore: true,
		});
	});

	it.each([
		["not an object", "nope", 10],
		[
			"an oversized page",
			{ items: [entry, { ...entry, id: "x" }], nextCursor: null },
			1,
		],
		["duplicate ids", { items: [entry, entry], nextCursor: null }, 10],
		[
			"a malformed entry",
			{ items: [{ ...entry, network: "devnet" }], nextCursor: null },
			10,
		],
		["a malformed cursor", { items: [entry], nextCursor: "a/b" }, 10],
		["a missing cursor", { items: [entry] }, 10],
	] as const)("fails closed on %s", (_label, body, limit) => {
		expect(parseAuditPage(body, limit)).toBeNull();
	});
});

describe("auditPaginationReducer", () => {
	const page = (ids: string[], nextCursor: string | null) => ({
		items: ids.map((id) => ({ ...MOCK_AUDIT_ENTRIES[0], id })),
		nextCursor,
		hasMore: nextCursor !== null,
	});

	it("appends pages and de-duplicates by id", () => {
		let state = auditPaginationReducer(initialAuditPaginationState, {
			type: "success",
			generation: 0,
			page: page(["a", "b"], "c1"),
		});
		state = auditPaginationReducer(state, {
			type: "success",
			generation: 0,
			page: page(["b", "c"], null),
		});
		expect(state.items.map((i) => i.id)).toEqual(["a", "b", "c"]);
		expect(state.status).toBe("exhausted");
		expect(canLoadMore(state)).toBe(false);
	});

	it("drops responses from a stale generation after a filter change", () => {
		const reset = auditPaginationReducer(initialAuditPaginationState, {
			type: "reset",
		});
		const next = auditPaginationReducer(reset, {
			type: "success",
			generation: 0,
			page: page(["stale"], null),
		});
		expect(next).toBe(reset);
	});

	it("keeps loaded rows and the cursor on failure so retry is idempotent", () => {
		const loaded = auditPaginationReducer(initialAuditPaginationState, {
			type: "success",
			generation: 0,
			page: page(["a"], "cursor-1"),
		});
		const failed = auditPaginationReducer(loaded, {
			type: "failure",
			generation: 0,
			error: { kind: "rate_limited", retryAt: 1, correlationId: null },
		});
		expect(failed.items).toHaveLength(1);
		expect(failed.nextCursor).toBe("cursor-1");
		expect(canLoadMore(failed)).toBe(true);
	});

	it("blocks load-more after invalid_cursor until restart", () => {
		const failed = auditPaginationReducer(
			{ ...initialAuditPaginationState, started: true, nextCursor: "x" },
			{
				type: "failure",
				generation: 0,
				error: { kind: "failed", code: "invalid_cursor", correlationId: null },
			},
		);
		expect(failed.nextCursor).toBeNull();
		expect(canLoadMore(failed)).toBe(false);
	});

	it("disallows concurrent requests", () => {
		const loading = auditPaginationReducer(initialAuditPaginationState, {
			type: "request",
			generation: 0,
		});
		expect(canLoadMore(loading)).toBe(false);
	});
});
