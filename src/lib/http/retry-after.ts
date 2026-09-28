import { readCorrelationId } from "./correlation";

/**
 * 429 Retry-After UX (issue #801).
 *
 * Invariants (see docs/security-ux-guards.md#429-retry-after-ux):
 *  - `Retry-After` is parsed as delta-seconds or an HTTP-date and always
 *    clamped to [MIN_RETRY_AFTER_MS, MAX_RETRY_AFTER_MS]. Missing or malformed
 *    values fall back to DEFAULT_RETRY_AFTER_MS, never to "retry immediately".
 *  - Only idempotent reads (GET/HEAD/OPTIONS) are retried automatically, at
 *    most MAX_ATTEMPTS times and only when the server-requested wait is short.
 *    Writes (spends, recovery, admin) are never auto-retried; the UI surfaces
 *    the wait and the user re-submits with the same Idempotency-Key.
 *  - Metrics carry the method, pathname (no query string, which may hold
 *    tokens), wait and correlation id — never headers or bodies.
 */

export const RATE_LIMIT_ERROR_CODE = "RATE_LIMITED" as const;

export const MIN_RETRY_AFTER_MS = 1_000;
export const MAX_RETRY_AFTER_MS = 5 * 60_000;
export const DEFAULT_RETRY_AFTER_MS = 30_000;

/** Longest server-requested wait we will sit through without user action. */
export const DEFAULT_MAX_AUTO_WAIT_MS = 10_000;
/** Hard cap on total attempts (initial + retries) for automatic retries. */
export const MAX_ATTEMPTS = 3;

const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Parse a raw `Retry-After` header into milliseconds from `now`.
 * Returns null when the header is absent or malformed.
 */
export function parseRetryAfter(
	value: string | null | undefined,
	now: number = Date.now(),
): number | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (trimmed.length === 0 || trimmed.length > 64) return null;

	if (/^\d+$/.test(trimmed)) {
		// Oversized digit strings are clamped by the caller; cap here so the
		// multiplication cannot overflow into Infinity.
		const seconds = Math.min(Number(trimmed), MAX_RETRY_AFTER_MS / 1000 + 1);
		return seconds * 1000;
	}

	// HTTP-date form. Require a letter so bare numbers with signs/decimals
	// ("-5", "1.5") are rejected rather than parsed as dates.
	if (!/[A-Za-z]/.test(trimmed)) return null;
	const at = Date.parse(trimmed);
	if (Number.isNaN(at)) return null;
	return Math.max(0, at - now);
}

/** Resolve a `Retry-After` header into a clamped, always-positive delay. */
export function resolveRetryDelayMs(
	value: string | null | undefined,
	now: number = Date.now(),
): number {
	const parsed = parseRetryAfter(value, now);
	const delay = parsed ?? DEFAULT_RETRY_AFTER_MS;
	return Math.min(MAX_RETRY_AFTER_MS, Math.max(MIN_RETRY_AFTER_MS, delay));
}

/** Format a delay as a `Retry-After` delta-seconds header value. */
export function formatRetryAfterSeconds(delayMs: number): string {
	return String(Math.ceil(delayMs / 1000));
}

export function isIdempotentMethod(method: string | undefined): boolean {
	return IDEMPOTENT_METHODS.has((method ?? "GET").toUpperCase());
}

export interface RateLimitState {
	code: typeof RATE_LIMIT_ERROR_CODE;
	retryAfterMs: number;
	/** Epoch ms at which the client may retry. */
	retryAt: number;
	correlationId: string | null;
}

/** Classify a response as rate-limited, or null for any other status. */
export function classifyRateLimit(
	response: Response,
	now: number = Date.now(),
): RateLimitState | null {
	if (response.status !== 429) return null;
	const retryAfterMs = resolveRetryDelayMs(
		response.headers.get("retry-after"),
		now,
	);
	return {
		code: RATE_LIMIT_ERROR_CODE,
		retryAfterMs,
		retryAt: now + retryAfterMs,
		correlationId: readCorrelationId(response.headers),
	};
}

export interface RateLimitMetric {
	name: "http.rate_limited";
	method: string;
	path: string;
	retryAfterMs: number;
	autoRetried: boolean;
	correlationId: string | null;
}

export interface FetchWithRetryAfterOptions {
	fetchImpl?: typeof fetch;
	/** Injectable for tests; must honour the abort signal. */
	sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
	now?: () => number;
	maxAttempts?: number;
	maxAutoWaitMs?: number;
	onMetric?: (metric: RateLimitMetric) => void;
}

export type FetchWithRetryAfterResult =
	| { kind: "response"; response: Response; attempts: number }
	| {
			kind: "rate_limited";
			response: Response;
			rateLimit: RateLimitState;
			attempts: number;
	  };

function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(signal.reason);
			return;
		}
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			clearTimeout(timer);
			reject(signal?.reason);
		};
		signal?.addEventListener("abort", onAbort, { once: true });
	});
}

function metricPath(input: RequestInfo | URL): string {
	const raw =
		typeof input === "string"
			? input
			: input instanceof URL
				? input.href
				: input.url;
	try {
		return new URL(raw, "http://localhost").pathname;
	} catch {
		return "[unparseable]";
	}
}

/**
 * `fetch` wrapper that honours `Retry-After` on 429.
 *
 * Idempotent reads are retried after short server-requested waits; anything
 * else (writes, long waits, exhausted attempts) is returned as a typed
 * `rate_limited` result for the UI to render with a countdown.
 */
export async function fetchWithRetryAfter(
	input: RequestInfo | URL,
	init: RequestInit = {},
	options: FetchWithRetryAfterOptions = {},
): Promise<FetchWithRetryAfterResult> {
	const fetchImpl = options.fetchImpl ?? fetch;
	const sleep = options.sleep ?? defaultSleep;
	const now = options.now ?? Date.now;
	const maxAttempts = Math.min(
		MAX_ATTEMPTS,
		Math.max(1, options.maxAttempts ?? 2),
	);
	const maxAutoWaitMs = options.maxAutoWaitMs ?? DEFAULT_MAX_AUTO_WAIT_MS;
	const method = (
		init.method ?? (input instanceof Request ? input.method : "GET")
	).toUpperCase();
	const autoRetryAllowed = isIdempotentMethod(method);
	const path = metricPath(input);

	let attempts = 0;
	for (;;) {
		attempts += 1;
		const response = await fetchImpl(input, init);
		const rateLimit = classifyRateLimit(response, now());
		if (rateLimit === null) {
			return { kind: "response", response, attempts };
		}

		const willRetry =
			autoRetryAllowed &&
			attempts < maxAttempts &&
			rateLimit.retryAfterMs <= maxAutoWaitMs;

		options.onMetric?.({
			name: "http.rate_limited",
			method,
			path,
			retryAfterMs: rateLimit.retryAfterMs,
			autoRetried: willRetry,
			correlationId: rateLimit.correlationId,
		});

		if (!willRetry) {
			return { kind: "rate_limited", response, rateLimit, attempts };
		}

		// Release the body before retrying so the connection can be reused.
		await response.body?.cancel().catch(() => undefined);
		await sleep(rateLimit.retryAfterMs, init.signal ?? undefined);
	}
}

/** Human-readable wait, e.g. "45s" or "2m 05s". Never negative. */
export function formatRetryCountdown(remainingMs: number): string {
	const total = Math.max(0, Math.ceil(remainingMs / 1000));
	if (total < 60) return `${total}s`;
	const minutes = Math.floor(total / 60);
	const seconds = String(total % 60).padStart(2, "0");
	return `${minutes}m ${seconds}s`;
}
