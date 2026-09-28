/**
 * Audit log pagination (issue #804).
 *
 * Invariants (see docs/team-access-and-audit-log.md#audit-log-pagination):
 *  - Keyset pagination ordered by (createdAt desc, id desc). A cursor names
 *    the last row served, so rows inserted concurrently never shift a page:
 *    no duplicates, no skips, and replaying a cursor returns the same page.
 *  - Cursors are opaque base64url tokens bound to the filter set that issued
 *    them. Reusing a cursor with different filters is `invalid_cursor`, so a
 *    cursor can never widen what a query returns.
 *  - Every parameter is validated before any read. Malformed values,
 *    duplicated parameters, inverted or oversized date ranges, and
 *    out-of-range limits fail closed with a stable code — never an
 *    unfiltered page.
 */

export const AUDIT_ERROR_CODES = {
	INVALID_FILTER: "invalid_filter",
	INVALID_CURSOR: "invalid_cursor",
	UNAUTHORIZED: "unauthorized",
	FORBIDDEN: "forbidden",
	RATE_LIMITED: "rate_limited",
	BACKEND_UNAVAILABLE: "backend_unavailable",
} as const;

export type AuditErrorCode =
	(typeof AUDIT_ERROR_CODES)[keyof typeof AUDIT_ERROR_CODES];

export const DEFAULT_AUDIT_PAGE_SIZE = 50;
export const MAX_AUDIT_PAGE_SIZE = 100;
export const MAX_AUDIT_RANGE_DAYS = 366;
export const MAX_CURSOR_LENGTH = 512;

export interface AuditEntry {
	id: string;
	actor: string;
	action: string;
	/** ISO-8601 timestamp. */
	createdAt: string;
	network: "testnet" | "futurenet" | "mainnet";
}

export interface AuditFilters {
	actor?: string;
	action?: string;
	from?: string;
	to?: string;
}

export interface AuditPageQuery {
	filters: AuditFilters;
	cursor: string | null;
	limit: number;
}

export interface AuditPage {
	items: AuditEntry[];
	nextCursor: string | null;
	hasMore: boolean;
}

export type ParseAuditPageResult =
	| { ok: true; query: AuditPageQuery }
	| {
			ok: false;
			code:
				| typeof AUDIT_ERROR_CODES.INVALID_FILTER
				| typeof AUDIT_ERROR_CODES.INVALID_CURSOR;
			field: string;
	  };

const PAGE_PARAMS = ["actor", "action", "from", "to", "cursor", "limit"];
const TOKEN_RE = /^[^\s\u0000-\u001f\u007f]{1,128}$/;
const ISO_RE =
	/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2}))?$/;
const CURSOR_RE = /^[A-Za-z0-9_-]+$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function invalid(
	field: string,
	code: "invalid_filter" | "invalid_cursor" = AUDIT_ERROR_CODES.INVALID_FILTER,
): ParseAuditPageResult {
	return { ok: false, code, field };
}

/** Validate `/api/activity` query params. Unknown params are ignored. */
export function parseAuditPageParams(
	params: URLSearchParams,
): ParseAuditPageResult {
	for (const name of PAGE_PARAMS) {
		// Parameter pollution (?limit=1&limit=100) is rejected, not resolved.
		if (params.getAll(name).length > 1) return invalid(name);
	}

	const filters: AuditFilters = {};
	for (const name of ["actor", "action"] as const) {
		const raw = params.get(name);
		if (raw === null) continue;
		if (!TOKEN_RE.test(raw)) return invalid(name);
		filters[name] = raw;
	}

	for (const name of ["from", "to"] as const) {
		const raw = params.get(name);
		if (raw === null) continue;
		if (!ISO_RE.test(raw) || Number.isNaN(Date.parse(raw))) {
			return invalid(name);
		}
		filters[name] = new Date(raw).toISOString();
	}
	if (filters.from && filters.to) {
		const span = Date.parse(filters.to) - Date.parse(filters.from);
		if (span < 0 || span > MAX_AUDIT_RANGE_DAYS * DAY_MS) {
			return invalid("to");
		}
	}

	let limit = DEFAULT_AUDIT_PAGE_SIZE;
	const rawLimit = params.get("limit");
	if (rawLimit !== null) {
		if (!/^\d{1,3}$/.test(rawLimit)) return invalid("limit");
		limit = Number(rawLimit);
		if (limit < 1 || limit > MAX_AUDIT_PAGE_SIZE) return invalid("limit");
	}

	const cursor = params.get("cursor");
	if (
		cursor !== null &&
		(cursor.length > MAX_CURSOR_LENGTH || !CURSOR_RE.test(cursor))
	) {
		return invalid("cursor", AUDIT_ERROR_CODES.INVALID_CURSOR);
	}

	return { ok: true, query: { filters, cursor, limit } };
}

/** Serialize a validated query back into URL params (for proxying/fetching). */
export function toAuditSearchParams(query: AuditPageQuery): URLSearchParams {
	const params = new URLSearchParams();
	for (const name of ["actor", "action", "from", "to"] as const) {
		const value = query.filters[name];
		if (value !== undefined) params.set(name, value);
	}
	if (query.cursor !== null) params.set("cursor", query.cursor);
	params.set("limit", String(query.limit));
	return params;
}

/** FNV-1a over the canonical filter tuple; binds a cursor to its filters. */
export function filterFingerprint(filters: AuditFilters): string {
	const canonical = [filters.actor, filters.action, filters.from, filters.to]
		.map((value) => value ?? "")
		.join("\u0000");
	let hash = 0x811c9dc5;
	for (let i = 0; i < canonical.length; i += 1) {
		hash ^= canonical.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	return hash.toString(16).padStart(8, "0");
}

interface CursorKey {
	createdAt: string;
	id: string;
}

function toBase64Url(text: string): string {
	const bytes = new TextEncoder().encode(text);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function fromBase64Url(token: string): string | null {
	try {
		const padded = token.replace(/-/g, "+").replace(/_/g, "/");
		const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
		const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		return null;
	}
}

export function encodeAuditCursor(
	key: CursorKey,
	filters: AuditFilters,
): string {
	return toBase64Url(
		JSON.stringify({
			v: 1,
			c: key.createdAt,
			i: key.id,
			f: filterFingerprint(filters),
		}),
	);
}

/** Decode a cursor issued for `filters`; null if forged, stale, or mismatched. */
export function decodeAuditCursor(
	cursor: string,
	filters: AuditFilters,
): CursorKey | null {
	const json = fromBase64Url(cursor);
	if (json === null) return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		return null;
	}
	if (typeof parsed !== "object" || parsed === null) return null;
	const { v, c, i, f } = parsed as Record<string, unknown>;
	if (v !== 1 || typeof c !== "string" || typeof i !== "string") return null;
	if (f !== filterFingerprint(filters)) return null;
	if (Number.isNaN(Date.parse(c)) || !TOKEN_RE.test(i)) return null;
	return { createdAt: c, id: i };
}

/** Descending (createdAt, id) comparator; negative means `a` sorts first. */
function compareDesc(a: CursorKey, b: CursorKey): number {
	const byTime = Date.parse(b.createdAt) - Date.parse(a.createdAt);
	if (byTime !== 0) return byTime;
	return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

export function matchesAuditFilters(
	entry: AuditEntry,
	filters: AuditFilters,
): boolean {
	if (filters.actor !== undefined && entry.actor !== filters.actor) {
		return false;
	}
	if (filters.action !== undefined && entry.action !== filters.action) {
		return false;
	}
	const at = Date.parse(entry.createdAt);
	if (filters.from !== undefined && at < Date.parse(filters.from)) return false;
	if (filters.to !== undefined && at > Date.parse(filters.to)) return false;
	return true;
}

export type PaginateResult =
	| { ok: true; page: AuditPage }
	| { ok: false; code: typeof AUDIT_ERROR_CODES.INVALID_CURSOR };

/** In-memory keyset pagination with the same semantics the backend serves. */
export function paginateAuditEntries(
	entries: readonly AuditEntry[],
	query: AuditPageQuery,
): PaginateResult {
	let after: CursorKey | null = null;
	if (query.cursor !== null) {
		after = decodeAuditCursor(query.cursor, query.filters);
		if (after === null) {
			return { ok: false, code: AUDIT_ERROR_CODES.INVALID_CURSOR };
		}
	}

	const sorted = entries
		.filter((entry) => matchesAuditFilters(entry, query.filters))
		.sort(compareDesc);
	const cursorKey = after;
	const remaining =
		cursorKey === null
			? sorted
			: sorted.filter((entry) => compareDesc(entry, cursorKey) > 0);

	const items = remaining.slice(0, query.limit);
	const hasMore = remaining.length > query.limit;
	const last = items.at(-1);
	return {
		ok: true,
		page: {
			items,
			hasMore,
			nextCursor:
				hasMore && last ? encodeAuditCursor(last, query.filters) : null,
		},
	};
}

export function isAuditEntry(value: unknown): value is AuditEntry {
	if (typeof value !== "object" || value === null) return false;
	const entry = value as Record<string, unknown>;
	return (
		typeof entry.id === "string" &&
		entry.id.length > 0 &&
		typeof entry.actor === "string" &&
		typeof entry.action === "string" &&
		typeof entry.createdAt === "string" &&
		!Number.isNaN(Date.parse(entry.createdAt)) &&
		(entry.network === "testnet" ||
			entry.network === "futurenet" ||
			entry.network === "mainnet")
	);
}

/**
 * Validate an upstream page. Returns null (fail closed) when the shape is
 * wrong, the page is larger than requested, or it contains duplicate ids.
 */
export function parseAuditPage(body: unknown, limit: number): AuditPage | null {
	if (typeof body !== "object" || body === null) return null;
	const { items, nextCursor } = body as Record<string, unknown>;
	if (!Array.isArray(items) || items.length > limit) return null;
	if (!items.every(isAuditEntry)) return null;
	if (new Set(items.map((item) => item.id)).size !== items.length) return null;
	if (
		nextCursor !== null &&
		(typeof nextCursor !== "string" ||
			nextCursor.length === 0 ||
			nextCursor.length > MAX_CURSOR_LENGTH ||
			!CURSOR_RE.test(nextCursor))
	) {
		return null;
	}
	return { items, nextCursor, hasMore: nextCursor !== null };
}
