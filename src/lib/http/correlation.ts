/**
 * Correlation id helpers shared by API routes and client fetch wrappers.
 *
 * A correlation id is opaque and never encodes secrets. Ids supplied by a
 * caller or an upstream are only echoed when they match a conservative
 * allow-list so an attacker cannot inject markup, log-forging newlines, or
 * oversized values into logs and user-facing error surfaces.
 */

export const CORRELATION_HEADER = "x-correlation-id";

const CORRELATION_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;

export function isValidCorrelationId(value: unknown): value is string {
	return typeof value === "string" && CORRELATION_ID_RE.test(value);
}

/** Read a correlation id from response/request headers, or null if absent/unsafe. */
export function readCorrelationId(headers: Headers): string | null {
	const candidate =
		headers.get(CORRELATION_HEADER) ?? headers.get("x-request-id");
	return isValidCorrelationId(candidate) ? candidate : null;
}

/** Echo a safe inbound correlation id, otherwise mint a fresh one. */
export function resolveCorrelationId(headers: Headers): string {
	return readCorrelationId(headers) ?? crypto.randomUUID();
}
