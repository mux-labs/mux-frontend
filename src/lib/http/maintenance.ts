import { readCorrelationId } from "./correlation";
import { resolveRetryDelayMs } from "./retry-after";

/**
 * Maintenance 503 UX (issue #802).
 *
 * A 503 is either planned maintenance or an unplanned dependency outage
 * (RPC/DB/Horizon). Both fail closed: writes stay disabled until the service
 * recovers. The distinction only changes the copy shown to the user.
 *
 * Invariants (see docs/security-ux-guards.md#maintenance-503-ux):
 *  - Maintenance is signalled by `x-mux-maintenance: true` or a JSON body
 *    `{ error: { code: "MAINTENANCE" } }`. Anything else is treated as a
 *    dependency outage — never as success, never as a cached result.
 *  - Server-provided message text is never rendered. The UI uses fixed copy
 *    so a spoofed/proxied 503 cannot inject phishing text or links.
 *  - `Retry-After` is clamped exactly like 429 handling.
 */

export const MAINTENANCE_HEADER = "x-mux-maintenance";

export const SERVICE_UNAVAILABLE_CODES = {
	MAINTENANCE: "MAINTENANCE",
	DEPENDENCY_UNAVAILABLE: "DEPENDENCY_UNAVAILABLE",
} as const;

export type ServiceUnavailableCode =
	(typeof SERVICE_UNAVAILABLE_CODES)[keyof typeof SERVICE_UNAVAILABLE_CODES];

export interface ServiceUnavailableState {
	code: ServiceUnavailableCode;
	retryAfterMs: number;
	retryAt: number;
	correlationId: string | null;
}

function bodyErrorCode(body: unknown): string | null {
	if (typeof body !== "object" || body === null) return null;
	const error = (body as { error?: unknown }).error;
	if (typeof error === "string") return error;
	if (typeof error !== "object" || error === null) return null;
	const code = (error as { code?: unknown }).code;
	return typeof code === "string" ? code : null;
}

export function isMaintenanceSignal(headers: Headers, body?: unknown): boolean {
	const header = headers.get(MAINTENANCE_HEADER)?.trim().toLowerCase();
	if (header === "true" || header === "1") return true;
	return bodyErrorCode(body)?.toUpperCase() === "MAINTENANCE";
}

/** Classify a 503 response; returns null for any other status. */
export function classifyServiceUnavailable(
	response: Response,
	body?: unknown,
	now: number = Date.now(),
): ServiceUnavailableState | null {
	if (response.status !== 503) return null;
	const retryAfterMs = resolveRetryDelayMs(
		response.headers.get("retry-after"),
		now,
	);
	return {
		code: isMaintenanceSignal(response.headers, body)
			? SERVICE_UNAVAILABLE_CODES.MAINTENANCE
			: SERVICE_UNAVAILABLE_CODES.DEPENDENCY_UNAVAILABLE,
		retryAfterMs,
		retryAt: now + retryAfterMs,
		correlationId: readCorrelationId(response.headers),
	};
}

/**
 * Fixed, user-facing copy per code. Deliberately not derived from the
 * response so upstream text can never reach the page.
 */
export const SERVICE_UNAVAILABLE_COPY: Record<
	ServiceUnavailableCode,
	{ title: string; body: string }
> = {
	MAINTENANCE: {
		title: "Scheduled maintenance",
		body: "Mux is undergoing maintenance. Sending funds and other changes are paused until it finishes. Your wallets and balances are safe.",
	},
	DEPENDENCY_UNAVAILABLE: {
		title: "Service temporarily unavailable",
		body: "We couldn't reach a required service. Sending funds and other changes are paused so nothing is applied twice or partially.",
	},
};
