/**
 * Notifications mark-read batch.
 *
 * Marks several notifications as read in a single request. Ids are
 * validated, de-duplicated and chunked to a bounded batch size so oversized
 * batches cannot be sent. Each chunk carries an `Idempotency-Key` derived
 * from its ids so replays are safe, and a correlation id for support. The
 * server stays the source of truth: failures are reported per chunk and no
 * ids are assumed read unless the server confirms them.
 */

export const MARK_READ_MAX_BATCH = 100;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const MarkReadErrorCode = {
	INVALID_IDS: "MARK_READ_INVALID_IDS",
	UNAUTHORIZED: "MARK_READ_UNAUTHORIZED",
	UPSTREAM_UNAVAILABLE: "MARK_READ_UPSTREAM_UNAVAILABLE",
} as const;

export type MarkReadErrorCodeValue =
	(typeof MarkReadErrorCode)[keyof typeof MarkReadErrorCode];

export interface MarkReadResult {
	/** Ids the server confirmed as read. */
	marked: string[];
	/** Ids that could not be marked, with the reason. */
	failed: { id: string; code: MarkReadErrorCodeValue }[];
	correlationId: string;
}

export function normalizeNotificationIds(ids: readonly string[]): {
	valid: string[];
	invalid: string[];
} {
	const valid = new Set<string>();
	const invalid: string[] = [];
	for (const id of ids) {
		if (typeof id === "string" && ID_PATTERN.test(id)) valid.add(id);
		else invalid.push(String(id));
	}
	return { valid: [...valid], invalid };
}

export function chunkIds(
	ids: readonly string[],
	size = MARK_READ_MAX_BATCH,
): string[][] {
	const chunks: string[][] = [];
	for (let i = 0; i < ids.length; i += size)
		chunks.push(ids.slice(i, i + size));
	return chunks;
}

function idempotencyKeyFor(ids: readonly string[]): string {
	return `mark-read:${[...ids].sort().join(",")}`;
}

export async function markNotificationsRead(
	ids: readonly string[],
	fetchImpl: typeof fetch = fetch,
): Promise<MarkReadResult> {
	const correlationId = crypto.randomUUID();
	const { valid, invalid } = normalizeNotificationIds(ids);
	const result: MarkReadResult = {
		marked: [],
		failed: invalid.map((id) => ({ id, code: MarkReadErrorCode.INVALID_IDS })),
		correlationId,
	};

	for (const chunk of chunkIds(valid)) {
		try {
			const res = await fetchImpl("/api/notifications/mark-read", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Idempotency-Key": idempotencyKeyFor(chunk),
					"X-Correlation-Id": correlationId,
				},
				body: JSON.stringify({ ids: chunk }),
			});
			if (!res.ok) {
				const code =
					res.status === 401 || res.status === 403
						? MarkReadErrorCode.UNAUTHORIZED
						: MarkReadErrorCode.UPSTREAM_UNAVAILABLE;
				result.failed.push(...chunk.map((id) => ({ id, code })));
				continue;
			}
			const body = (await res.json().catch(() => null)) as {
				marked?: unknown;
			} | null;
			const confirmed = Array.isArray(body?.marked)
				? chunk.filter((id) => (body.marked as unknown[]).includes(id))
				: [];
			result.marked.push(...confirmed);
			result.failed.push(
				...chunk
					.filter((id) => !confirmed.includes(id))
					.map((id) => ({ id, code: MarkReadErrorCode.UPSTREAM_UNAVAILABLE })),
			);
		} catch {
			result.failed.push(
				...chunk.map((id) => ({
					id,
					code: MarkReadErrorCode.UPSTREAM_UNAVAILABLE,
				})),
			);
		}
	}

	return result;
}
