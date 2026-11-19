import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
	evaluateSendFlowGate,
	readServerSendFlowFlags,
	SEND_GATE_CODES,
} from "@/lib/feature-flags/send-flows";
import { getBackendBaseUrl } from "@/lib/http/backend-url";
import {
	CORRELATION_HEADER,
	resolveCorrelationId,
} from "@/lib/http/correlation";
import {
	forwardCredentialHeaders,
	hasCredential,
	isCsrfSafe,
} from "@/lib/http/credentials";
import {
	classifyServiceUnavailable,
	MAINTENANCE_HEADER,
	SERVICE_UNAVAILABLE_CODES,
} from "@/lib/http/maintenance";
import { callerKey, createFixedWindowLimiter } from "@/lib/http/rate-limiter";
import {
	formatRetryAfterSeconds,
	resolveRetryDelayMs,
} from "@/lib/http/retry-after";
import {
	isValidIdempotencyKey,
	MAX_BODY_BYTES,
	parseSendBody,
	SEND_ERROR_CODES,
	type SendErrorCode,
} from "@/lib/send/send-request";

/**
 * Feature-flagged send entrypoint (issue #803).
 *
 * Invariants (see docs/security-ux-guards.md#feature-flagged-send-flows):
 *  - Deny-by-default: a credential is required, and the server-only send
 *    flags/kill switch are evaluated on every request.
 *  - The Mux backend is the source of truth for authorization and spends.
 *    This route never trusts client-supplied roles; it forwards the caller's
 *    credential and maps the backend's verdict to stable codes.
 *  - Idempotency-Key is mandatory and forwarded; concurrent duplicates on
 *    this instance are rejected while one is in flight.
 *  - Fail closed: no backend configured, upstream outage, maintenance, or an
 *    unrecognised upstream response all return an error — never a mock or
 *    optimistic success.
 *  - Logs carry only the correlation id, code, status and network.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM_TIMEOUT_MS = 15_000;

/**
 * Longest planned-maintenance wait surfaced to the caller. Upstream may ask
 * for days; anything over an hour is clamped so the client shows a bounded
 * countdown instead of an unbounded outage window.
 */
const MAX_MAINTENANCE_RETRY_AFTER_SECONDS = 3_600;

function maintenanceRetryAfterSeconds(
	upstream: Response,
	fallbackMs: number,
): string {
	const raw = upstream.headers.get("retry-after")?.trim() ?? "";
	const seconds = /^\d{1,7}$/.test(raw)
		? Number(raw)
		: Math.ceil(fallbackMs / 1000);
	return String(
		Math.min(MAX_MAINTENANCE_RETRY_AFTER_SECONDS, Math.max(1, seconds)),
	);
}

/**
 * Maximum number of in-flight/replay keys retained on this instance. The set
 * is bounded so a client that generates a fresh key per request cannot grow
 * process memory without limit (issue #1026). Oldest keys are evicted first
 * (insertion-order LRU); an evicted key is treated as new and forwarded.
 */
const MAX_IN_FLIGHT_KEYS = 1_000;

const limiter = createFixedWindowLimiter(10, 60_000);
const inFlight = new Set<string>();

function markInFlight(flightKey: string): void {
	if (inFlight.has(flightKey)) {
		inFlight.delete(flightKey);
	}
	inFlight.add(flightKey);
	while (inFlight.size > MAX_IN_FLIGHT_KEYS) {
		const oldest = inFlight.values().next().value;
		if (oldest === undefined) break;
		inFlight.delete(oldest);
	}
}

function logSendEvent(fields: {
	correlationId: string;
	code: SendErrorCode | "SEND_ACCEPTED";
	status: number;
	network?: string;
}): void {
	console.info(JSON.stringify({ event: "send.request", ...fields }));
}

function errorResponse(
	status: number,
	code: SendErrorCode,
	message: string,
	correlationId: string,
	extraHeaders: Record<string, string> = {},
	network?: string,
): NextResponse {
	logSendEvent({ correlationId, code, status, network });
	return NextResponse.json(
		{ error: { code, message, correlationId } },
		{
			status,
			headers: { [CORRELATION_HEADER]: correlationId, ...extraHeaders },
		},
	);
}

async function readUpstreamJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return null;
	}
}

function upstreamCode(body: unknown): string {
	if (typeof body !== "object" || body === null) return "";
	const error = (body as { error?: unknown }).error;
	if (typeof error === "string") return error.toLowerCase();
	if (typeof error === "object" && error !== null) {
		const code = (error as { code?: unknown }).code;
		if (typeof code === "string") return code.toLowerCase();
	}
	return "";
}

export async function POST(request: Request): Promise<NextResponse> {
	const correlationId = resolveCorrelationId(request.headers);

	if (!hasCredential(request)) {
		return errorResponse(
			401,
			SEND_ERROR_CODES.UNAUTHORIZED,
			"A valid owner, delegate, API key, or JWT credential is required.",
			correlationId,
		);
	}

	if (!isCsrfSafe(request)) {
		return errorResponse(
			403,
			SEND_ERROR_CODES.FORBIDDEN,
			"Cross-origin send requests are not allowed.",
			correlationId,
		);
	}

	const rateKey = callerKey(request);
	const decision = limiter.check(rateKey);
	if (!decision.allowed) {
		return errorResponse(
			429,
			SEND_ERROR_CODES.RATE_LIMITED,
			"Too many send requests. Wait before retrying.",
			correlationId,
			{ "retry-after": formatRetryAfterSeconds(decision.retryAfterMs) },
		);
	}

	const flags = readServerSendFlowFlags();
	const baseGate = evaluateSendFlowGate(flags);
	if (!baseGate.allowed) {
		const status =
			baseGate.code === SEND_GATE_CODES.KILL_SWITCH_ENGAGED ||
			baseGate.code === SEND_GATE_CODES.NETWORK_MISCONFIGURED
				? 503
				: 403;
		return errorResponse(
			status,
			baseGate.code,
			"Sending is not available right now.",
			correlationId,
		);
	}

	const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
	if (!isValidIdempotencyKey(idempotencyKey)) {
		return errorResponse(
			400,
			SEND_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED,
			"An Idempotency-Key header (16-128 URL-safe characters) is required.",
			correlationId,
		);
	}

	const declaredLength = Number(request.headers.get("content-length") ?? "0");
	if (declaredLength > MAX_BODY_BYTES) {
		return errorResponse(
			413,
			SEND_ERROR_CODES.INVALID_INPUT,
			"Request body is too large.",
			correlationId,
		);
	}
	const text = await request.text();
	if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
		return errorResponse(
			413,
			SEND_ERROR_CODES.INVALID_INPUT,
			"Request body is too large.",
			correlationId,
		);
	}
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		return errorResponse(
			400,
			SEND_ERROR_CODES.INVALID_INPUT,
			"Request body must be valid JSON.",
			correlationId,
		);
	}
	const body = parseSendBody(raw);
	if (!body) {
		return errorResponse(
			400,
			SEND_ERROR_CODES.INVALID_INPUT,
			"Request body is malformed.",
			correlationId,
		);
	}

	const gate = evaluateSendFlowGate(flags, body.network);
	if (!gate.allowed) {
		return errorResponse(
			gate.code === SEND_GATE_CODES.NETWORK_MISMATCH ? 400 : 403,
			gate.code,
			"Sending is not available on the requested network.",
			correlationId,
		);
	}

	const baseUrl = getBackendBaseUrl();
	if (baseUrl === null) {
		// Sends are never mocked, even in local dev.
		return errorResponse(
			503,
			SEND_ERROR_CODES.BACKEND_UNAVAILABLE,
			"Sending is temporarily unavailable.",
			correlationId,
			{},
			gate.network,
		);
	}

	// Scope the in-flight guard to the caller so one user's key cannot block another's.
	const flightKey = createHash("sha256")
		.update(`${rateKey}\u0000${idempotencyKey}`)
		.digest("hex");
	if (inFlight.has(flightKey)) {
		return errorResponse(
			409,
			SEND_ERROR_CODES.REQUEST_IN_PROGRESS,
			"An identical send is already in progress.",
			correlationId,
			{},
			gate.network,
		);
	}
	markInFlight(flightKey);

	try {
		const forwardHeaders: Record<string, string> = {
			...forwardCredentialHeaders(request),
			"content-type": "application/json",
			"idempotency-key": idempotencyKey,
			[CORRELATION_HEADER]: correlationId,
		};

		let upstream: Response;
		try {
			upstream = await fetch(`${baseUrl}/transactions`, {
				method: "POST",
				headers: forwardHeaders,
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
			});
		} catch {
			return errorResponse(
				503,
				SEND_ERROR_CODES.BACKEND_UNAVAILABLE,
				"Sending is temporarily unavailable.",
				correlationId,
				{},
				gate.network,
			);
		}

		if (upstream.status === 503) {
			const classification = classifyServiceUnavailable(upstream);
			if (classification === SERVICE_UNAVAILABLE_CODES.MAINTENANCE) {
				return errorResponse(
					503,
					SEND_ERROR_CODES.MAINTENANCE,
					"Sending is paused for scheduled maintenance.",
					correlationId,
					{
						[MAINTENANCE_HEADER]: "1",
						"retry-after": maintenanceRetryAfterSeconds(
							upstream,
							resolveRetryDelayMs(upstream),
						),
					},
					gate.network,
				);
			}
			return errorResponse(
				503,
				SEND_ERROR_CODES.BACKEND_UNAVAILABLE,
				"Sending is temporarily unavailable.",
				correlationId,
				{},
				gate.network,
			);
		}

		if (upstream.status === 429) {
			return errorResponse(
				429,
				SEND_ERROR_CODES.RATE_LIMITED,
				"Too many send requests. Wait before retrying.",
				correlationId,
				{ "retry-after": formatRetryAfterSeconds(resolveRetryDelayMs(upstream)) },
				gate.network,
			);
		}

		if (upstream.status === 401 || upstream.status === 403) {
			return errorResponse(
				upstream.status,
				SEND_ERROR_CODES.UNAUTHORIZED,
				"The credential is not authorized to send.",
				correlationId,
				{},
				gate.network,
			);
		}

		if (upstream.status === 409) {
			return errorResponse(
				409,
				SEND_ERROR_CODES.REQUEST_IN_PROGRESS,
				"An identical send is already in progress.",
				correlationId,
				{},
				gate.network,
			);
		}

		if (!upstream.ok) {
			const code = upstreamCode(await readUpstreamJson(upstream));
			if (code === "insufficient_funds") {
				return errorResponse(
					402,
					SEND_ERROR_CODES.INSUFFICIENT_FUNDS,
					"Insufficient funds for this send.",
					correlationId,
					{},
					gate.network,
				);
			}
			return errorResponse(
				502,
				SEND_ERROR_CODES.UPSTREAM_ERROR,
				"The send could not be completed.",
				correlationId,
				{},
				gate.network,
			);
		}

		const payload = await readUpstreamJson(upstream);
		logSendEvent({
			correlationId,
			code: "SEND_ACCEPTED",
			status: 202,
			network: gate.network,
		});
		return NextResponse.json(payload, {
			status: 202,
			headers: { [CORRELATION_HEADER]: correlationId },
		});
	} finally {
		inFlight.delete(flightKey);
	}
}
