import { describe, expect, it } from "vitest";
import { MOCK_AUDIT_ENTRIES, MOCK_AUDIT_ENTRY_COUNT } from "./mock-entries";
import {
	type AuditEntry,
	type AuditPageQuery,
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
		["from=2026-02-01&to=2026-01-01", "to"],
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
