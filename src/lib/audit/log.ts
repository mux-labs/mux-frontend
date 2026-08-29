/**
 * Minimal append-only audit log used by the mock/dev fallback path of
 * `/api/activity` (see src/app/api/activity/route.ts).
 *
 * This is a placeholder for the real immutable audit log, which is owned by
 * mux-backend and served over the real `/activity` endpoint once
 * `NEXT_PUBLIC_API_URL` is configured. Entries appended here are frozen and
 * never mutated or removed, mirroring the append-only contract the real
 * backend log must uphold — but the store itself is in-memory and resets on
 * every process restart, so it must never be treated as a source of truth
 * in production.
 */

export interface AuditLogEntry {
	id: string;
	type: string;
	description: string;
	timestamp: string;
	network?: string;
	status: "success" | "pending" | "error";
}

const entries: AuditLogEntry[] = [];

/** Appends an immutable entry to the in-memory audit log (dev/mock use only). */
export function appendAuditLog(entry: AuditLogEntry): AuditLogEntry {
	const frozen = Object.freeze({ ...entry });
	entries.push(frozen);
	return frozen;
}

/** Returns all entries recorded so far, oldest first. */
export function getAuditLog(): readonly AuditLogEntry[] {
	return entries;
}
