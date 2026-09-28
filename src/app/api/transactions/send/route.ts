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

const limiter = createFixedWindowLimiter(10, 60_000);
const inFlight = new Set<string>();

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
	inFlight.add(flightKey);

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
				cache: "no-store",
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

		const upstreamBody = await readUpstreamJson(upstream);

		if (upstream.ok) {
			if (typeof upstreamBody !== "object" || upstreamBody === null) {
				return errorResponse(
					502,
					SEND_ERROR_CODES.UPSTREAM_ERROR,
					"The send result could not be confirmed. Check activity before retrying.",
					correlationId,
					{},
					gate.network,
				);
			}
			logSendEvent({
				correlationId,
				code: "SEND_ACCEPTED",
				status: upstream.status,
				network: gate.network,
			});
			return NextResponse.json(
				{ transaction: upstreamBody, correlationId },
				{
					status: upstream.status,
					headers: { [CORRELATION_HEADER]: correlationId },
				},
			);
		}

		if (upstream.status === 429) {
			const delay = resolveRetryDelayMs(upstream.headers.get("retry-after"));
			return errorResponse(
				429,
				SEND_ERROR_CODES.RATE_LIMITED,
				"Too many send requests. Wait before retrying.",
				correlationId,
				{ "retry-after": formatRetryAfterSeconds(delay) },
				gate.network,
			);
		}

		const unavailable = classifyServiceUnavailable(upstream, upstreamBody);
		if (unavailable) {
			const maintenance =
				unavailable.code === SERVICE_UNAVAILABLE_CODES.MAINTENANCE;
			return errorResponse(
				503,
				maintenance
					? SEND_ERROR_CODES.MAINTENANCE
					: SEND_ERROR_CODES.BACKEND_UNAVAILABLE,
				"Sending is temporarily unavailable.",
				correlationId,
				{
					"retry-after": formatRetryAfterSeconds(unavailable.retryAfterMs),
					...(maintenance ? { [MAINTENANCE_HEADER]: "true" } : {}),
				},
				gate.network,
			);
		}

		const code = upstreamCode(upstreamBody);
		switch (upstream.status) {
			case 401:
				return errorResponse(
					401,
					code.includes("expired")
						? SEND_ERROR_CODES.AUTH_EXPIRED
						: SEND_ERROR_CODES.UNAUTHORIZED,
					"Your session is no longer valid. Sign in again.",
					correlationId,
					{},
					gate.network,
				);
			case 403:
				return errorResponse(
					403,
					code.includes("revoked")
						? SEND_ERROR_CODES.DELEGATE_REVOKED
						: SEND_ERROR_CODES.FORBIDDEN,
					"You are not authorized to send from this wallet.",
					correlationId,
					{},
					gate.network,
				);
			case 409:
				return errorResponse(
					409,
					SEND_ERROR_CODES.IDEMPOTENCY_CONFLICT,
					"This Idempotency-Key was already used for a different send.",
					correlationId,
					{},
					gate.network,
				);
			case 400:
			case 422:
				return errorResponse(
					400,
					SEND_ERROR_CODES.INVALID_INPUT,
					"The send request was rejected.",
					correlationId,
					{},
					gate.network,
				);
			default:
				return errorResponse(
					502,
					SEND_ERROR_CODES.UPSTREAM_ERROR,
					"The send result could not be confirmed. Check activity before retrying.",
					correlationId,
					{},
					gate.network,
				);
		}
	} finally {
		inFlight.delete(flightKey);
	}
}
