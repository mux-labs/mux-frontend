import { SEND_GATE_CODES } from "@/lib/feature-flags/send-flows";

/**
 * Typed contract for `POST /api/transactions/send` (issue #803): stable
 * error codes and strict body validation. Kept out of the route module
 * because Next.js route files may only export handlers and route config.
 */

export const SEND_ERROR_CODES = {
	...SEND_GATE_CODES,
	UNAUTHORIZED: "SEND_UNAUTHORIZED",
	AUTH_EXPIRED: "SEND_AUTH_EXPIRED",
	FORBIDDEN: "SEND_FORBIDDEN",
	DELEGATE_REVOKED: "SEND_DELEGATE_REVOKED",
	INVALID_INPUT: "SEND_INVALID_INPUT",
	IDEMPOTENCY_KEY_REQUIRED: "SEND_IDEMPOTENCY_KEY_REQUIRED",
	IDEMPOTENCY_CONFLICT: "SEND_IDEMPOTENCY_CONFLICT",
	REQUEST_IN_PROGRESS: "SEND_REQUEST_IN_PROGRESS",
	RATE_LIMITED: "SEND_RATE_LIMITED",
	MAINTENANCE: "SEND_MAINTENANCE",
	BACKEND_UNAVAILABLE: "SEND_BACKEND_UNAVAILABLE",
	UPSTREAM_ERROR: "SEND_UPSTREAM_ERROR",
} as const;

export type SendErrorCode =
	(typeof SEND_ERROR_CODES)[keyof typeof SEND_ERROR_CODES];

export interface SendRequestBody {
	/** Source wallet id (not an address or key). */
	walletId: string;
	/** Stellar StrKey account (G…) or contract (C…) address. */
	destination: string;
	/** Positive decimal string with at most 7 fractional digits. */
	amount: string;
	/** "native" or CODE:ISSUER. */
	asset: string;
	network: string;
	memo?: string;
}

export const MAX_BODY_BYTES = 4 * 1024;
const ALLOWED_KEYS = new Set([
	"walletId",
	"destination",
	"amount",
	"asset",
	"network",
	"memo",
]);
const WALLET_ID_RE = /^[A-Za-z0-9_-]{3,64}$/;
const DESTINATION_RE = /^[GC][A-Z2-7]{55}$/;
const AMOUNT_RE = /^(0|[1-9]\d{0,11})(\.\d{1,7})?$/;
const ASSET_RE = /^(native|[A-Za-z0-9]{1,12}:G[A-Z2-7]{55})$/;
const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_-]{16,128}$/;
const MAX_MEMO_BYTES = 28;

export function isValidIdempotencyKey(value: string): boolean {
	return IDEMPOTENCY_KEY_RE.test(value);
}

export function parseSendBody(raw: unknown): SendRequestBody | null {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		return null;
	}
	const body = raw as Record<string, unknown>;
	if (Object.keys(body).some((key) => !ALLOWED_KEYS.has(key))) return null;

	const { walletId, destination, amount, asset, network, memo } = body;
	if (typeof walletId !== "string" || !WALLET_ID_RE.test(walletId)) {
		return null;
	}
	if (typeof destination !== "string" || !DESTINATION_RE.test(destination)) {
		return null;
	}
	if (
		typeof amount !== "string" ||
		!AMOUNT_RE.test(amount) ||
		Number(amount) <= 0
	) {
		return null;
	}
	if (typeof asset !== "string" || !ASSET_RE.test(asset)) return null;
	if (typeof network !== "string") return null;
	if (
		memo !== undefined &&
		(typeof memo !== "string" ||
			new TextEncoder().encode(memo).length > MAX_MEMO_BYTES)
	) {
		return null;
	}
	return {
		walletId,
		destination,
		amount,
		asset,
		network,
		...(memo === undefined ? {} : { memo }),
	};
}
