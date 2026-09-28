import { NextResponse } from "next/server";
import { MOCK_AUDIT_ENTRIES } from "@/lib/audit/mock-entries";
import {
	AUDIT_ERROR_CODES,
	type AuditErrorCode,
	type AuditPage,
	type AuditPageQuery,
	paginateAuditEntries,
	parseAuditPage,
	parseAuditPageParams,
	toAuditSearchParams,
} from "@/lib/audit/pagination";
import {
	getBackendBaseUrl,
	isMockFallbackAllowed,
} from "@/lib/http/backend-url";
import {
	CORRELATION_HEADER,
	resolveCorrelationId,
} from "@/lib/http/correlation";
import {
	forwardCredentialHeaders,
	hasCredential,
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

/**
 * Paginated activity / audit log (issue #804).
 *
 * Invariants (see docs/team-access-and-audit-log.md#audit-log-pagination):
 *  - Deny-by-default: a credential is required. With a backend configured,
 *    the backend decides the caller's role (admin-only) and this route maps
 *    its verdict to stable codes; client-supplied roles are never trusted.
 *  - Read-only and idempotent: the same query + cursor returns the same page.
 *  - Fail closed: invalid params never yield an unfiltered page, upstream
 *    outages and malformed upstream pages return 503, and the mock fixture
 *    is never served in production or on mainnet.
 *  - Logs carry the correlation id, applied filter keys (not values), the
 *    result count and the code.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM_TIMEOUT_MS = 10_000;
const limiter = createFixedWindowLimiter(60, 60_000);

function logAuditEvent(fields: {
	correlationId: string;
	code: AuditErrorCode | "ok";
	status: number;
	filterKeys?: string[];
	count?: number;
}): void {
	console.info(JSON.stringify({ event: "audit.page", ...fields }));
}

function errorResponse(
	status: number,
	code: AuditErrorCode,
	message: string,
	correlationId: string,
	extraHeaders: Record<string, string> = {},
): NextResponse {
	logAuditEvent({ correlationId, code, status });
	return NextResponse.json(
		{ error: { code, message, correlationId } },
		{
			status,
			headers: {
				[CORRELATION_HEADER]: correlationId,
				"cache-control": "no-store",
				...extraHeaders,
			},
		},
	);
}

function pageResponse(
	page: AuditPage,
	query: AuditPageQuery,
	correlationId: string,
): NextResponse {
	logAuditEvent({
		correlationId,
		code: "ok",
		status: 200,
		filterKeys: Object.keys(query.filters),
		count: page.items.length,
	});
	return NextResponse.json(
		{ ...page, correlationId },
		{
			headers: {
				[CORRELATION_HEADER]: correlationId,
				"cache-control": "no-store",
			},
		},
	);
}

async function readJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return null;
	}
}

function upstreamCode(body: unknown): string {
	if (typeof body !== "object" || body === null) return "";
	const error = (body as { error?: unknown }).error;
	if (typeof error === "string") return error;
	if (typeof error === "object" && error !== null) {
		const code = (error as { code?: unknown }).code;
		if (typeof code === "string") return code;
	}
	return "";
}

export async function GET(request: Request): Promise<NextResponse> {
	const correlationId = resolveCorrelationId(request.headers);

	if (!hasCredential(request)) {
		return errorResponse(
			401,
			AUDIT_ERROR_CODES.UNAUTHORIZED,
			"A valid session, API key, or JWT is required.",
			correlationId,
		);
	}

	const decision = limiter.check(callerKey(request));
	if (!decision.allowed) {
		return errorResponse(
			429,
			AUDIT_ERROR_CODES.RATE_LIMITED,
			"Too many audit log requests. Wait before retrying.",
			correlationId,
			{ "retry-after": formatRetryAfterSeconds(decision.retryAfterMs) },
		);
	}

	const parsed = parseAuditPageParams(new URL(request.url).searchParams);
	if (!parsed.ok) {
		return errorResponse(
			400,
			parsed.code,
			parsed.code === AUDIT_ERROR_CODES.INVALID_CURSOR
				? "The cursor is not valid for this query. Start from the first page."
				: `The "${parsed.field}" parameter is invalid.`,
			correlationId,
		);
	}
	const { query } = parsed;

	const baseUrl = getBackendBaseUrl();
	if (baseUrl === null) {
		if (!isMockFallbackAllowed()) {
			return errorResponse(
				503,
				AUDIT_ERROR_CODES.BACKEND_UNAVAILABLE,
				"The audit log is temporarily unavailable.",
				correlationId,
			);
		}
		const result = paginateAuditEntries(MOCK_AUDIT_ENTRIES, query);
		if (!result.ok) {
			return errorResponse(
				400,
				result.code,
				"The cursor is not valid for this query. Start from the first page.",
				correlationId,
			);
		}
		return pageResponse(result.page, query, correlationId);
	}

	const headers: Record<string, string> = {
		...forwardCredentialHeaders(request),
		[CORRELATION_HEADER]: correlationId,
		accept: "application/json",
	};

	let upstream: Response;
	try {
		upstream = await fetch(
			`${baseUrl}/activity?${toAuditSearchParams(query).toString()}`,
			{
				headers,
				signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
				cache: "no-store",
			},
		);
	} catch {
		return errorResponse(
			503,
			AUDIT_ERROR_CODES.BACKEND_UNAVAILABLE,
			"The audit log is temporarily unavailable.",
			correlationId,
		);
	}

	const body = await readJson(upstream);

	if (upstream.ok) {
		const page = parseAuditPage(body, query.limit);
		if (page === null) {
			// A malformed page could hide activity; never pass it through.
			return errorResponse(
				503,
				AUDIT_ERROR_CODES.BACKEND_UNAVAILABLE,
				"The audit log is temporarily unavailable.",
				correlationId,
			);
		}
		return pageResponse(page, query, correlationId);
	}

	switch (upstream.status) {
		case 401:
			return errorResponse(
				401,
				AUDIT_ERROR_CODES.UNAUTHORIZED,
				"Your session is no longer valid. Sign in again.",
				correlationId,
			);
		case 403:
			return errorResponse(
				403,
				AUDIT_ERROR_CODES.FORBIDDEN,
				"Only admins can view the audit log.",
				correlationId,
			);
		case 400:
			return errorResponse(
				400,
				upstreamCode(body) === AUDIT_ERROR_CODES.INVALID_CURSOR
					? AUDIT_ERROR_CODES.INVALID_CURSOR
					: AUDIT_ERROR_CODES.INVALID_FILTER,
				"The audit log query was rejected.",
				correlationId,
			);
		case 429:
			return errorResponse(
				429,
				AUDIT_ERROR_CODES.RATE_LIMITED,
				"Too many audit log requests. Wait before retrying.",
				correlationId,
				{
					"retry-after": formatRetryAfterSeconds(
						resolveRetryDelayMs(upstream.headers.get("retry-after")),
					),
				},
			);
		default: {
			const unavailable = classifyServiceUnavailable(upstream, body);
			const extra: Record<string, string> = {};
			if (unavailable) {
				extra["retry-after"] = formatRetryAfterSeconds(
					unavailable.retryAfterMs,
				);
				if (unavailable.code === SERVICE_UNAVAILABLE_CODES.MAINTENANCE) {
					extra[MAINTENANCE_HEADER] = "true";
				}
			}
			return errorResponse(
				503,
				AUDIT_ERROR_CODES.BACKEND_UNAVAILABLE,
				"The audit log is temporarily unavailable.",
				correlationId,
				extra,
			);
		}
	}
}
