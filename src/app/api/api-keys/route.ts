import { NextResponse } from "next/server";
import { mockApiKeys } from "@/mock-data/api-keys";
import { isAuthorized, redact } from "./guards";

type ApiKeyAction = "create" | "rotate" | "revoke";

const DESTRUCTIVE_ACTIONS: ApiKeyAction[] = ["rotate", "revoke"];

const ERROR_CODES = {
  CONFIRMATION_REQUIRED: "API_KEY_CONFIRMATION_REQUIRED",
  INVALID_ACTION: "API_KEY_INVALID_ACTION",
  INVALID_BODY: "API_KEY_INVALID_BODY",
  INVALID_FILTER: "API_KEY_INVALID_FILTER",
  INVALID_RANGE: "API_KEY_INVALID_RANGE",
  NOT_FOUND: "API_KEY_NOT_FOUND",
  UNAUTHORIZED: "API_KEY_UNAUTHORIZED",
  UPSTREAM_UNAVAILABLE: "API_KEY_UPSTREAM_UNAVAILABLE",
} as const;

const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 90;

// Audit log filters: bounded, allow-listed query surface. Unknown values are
// rejected (deny-by-default) rather than silently ignored.
const AUDIT_ACTIONS = ["create", "rotate", "revoke"] as const;
type AuditAction = (typeof AUDIT_ACTIONS)[number];
const AUDIT_OUTCOMES = ["success", "failure"] as const;
type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];
const MAX_AUDIT_LIMIT = 100;
const DEFAULT_AUDIT_LIMIT = 50;

// Idempotency: replaying the same request id must not re-run a privileged write.
const IDEMPOTENCY_HEADER = "idempotency-key";
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const idempotencyCache = new Map<string, { status: number; body: unknown }>();

function errorResponse(
  status: number,
  code: string,
  message: string,
  correlationId: string,
) {
  return NextResponse.json(
    { error: { code, message, correlationId } },
    { status },
  );
}

function newCorrelationId(): string {
  // CSPRNG-backed id: unique even when Date.now is fixed, unlike Math.random.
  return `apikey_${crypto.randomUUID()}`;
}

// Idempotency keys are opaque client tokens; reject oversized/adversarial input
// and never log the raw value.
function parseIdempotencyKey(request: Request): string | null {
  const raw = request.headers.get(IDEMPOTENCY_HEADER);
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    return null;
  }
  return trimmed;
}

function parseRangeDays(value: string | null): number | null {
  if (value === null) return DEFAULT_RANGE_DAYS;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_RANGE_DAYS) {
    return null;
  }
  return parsed;
}

// Audit log filters: parse the allow-listed action/outcome filters and a bounded
// limit. Returns null when any provided value is outside the allow-list so the
// caller can fail closed with a stable error code.
function parseAuditFilters(searchParams: URLSearchParams): {
  action: AuditAction | null;
  outcome: AuditOutcome | null;
  limit: number;
} | null {
  const rawAction = searchParams.get("action");
  let action: AuditAction | null = null;
  if (rawAction !== null) {
    if (!(AUDIT_ACTIONS as readonly string[]).includes(rawAction)) return null;
    action = rawAction as AuditAction;
  }

  const rawOutcome = searchParams.get("outcome");
  let outcome: AuditOutcome | null = null;
  if (rawOutcome !== null) {
    if (!(AUDIT_OUTCOMES as readonly string[]).includes(rawOutcome)) return null;
    outcome = rawOutcome as AuditOutcome;
  }

  const rawLimit = searchParams.get("limit");
  let limit = DEFAULT_AUDIT_LIMIT;
  if (rawLimit !== null) {
    const parsed = Number(rawLimit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_AUDIT_LIMIT) {
      return null;
    }
    limit = parsed;
  }

  return { action, outcome, limit };
}

// Deterministic, non-secret usage time-series derived from the key id so the
// chart is stable across requests without persisting raw key material.
function usageSeries(keyId: string, days: number) {
  let seed = 0;
  for (let i = 0; i < keyId.length; i += 1) {
    seed = (seed * 31 + keyId.charCodeAt(i)) % 100000;
  }
  const points: { date: string; requests: number; errors: number }[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const requests = seed % 500;
    points.push({ date, requests, errors: requests % 7 });
  }
  return points;
}

// Deterministic, non-secret audit entries derived from the key id so the log is
// stable across requests without persisting raw key material or secrets.
function auditEntries(
  keyId: string,
  action: AuditAction | null,
  outcome: AuditOutcome | null,
  limit: number,
) {
  let seed = 0;
  for (let i = 0; i < keyId.length; i += 1) {
    seed = (seed * 31 + keyId.charCodeAt(i)) % 100000;
  }
  const entries: {
    id: string;
    action: AuditAction;
    outcome: AuditOutcome;
    actor: string;
    timestamp: string;
  }[] = [];
  const now = Date.now();
  for (let i = 0; i < limit; i += 1) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const entryAction = AUDIT_ACTIONS[seed % AUDIT_ACTIONS.length];
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const entryOutcome = AUDIT_OUTCOMES[seed % AUDIT_OUTCOMES.length];
    if (action !== null && entryAction !== action) continue;
    if (outcome !== null && entryOutcome !== outcome) continue;
    entries.push({
      id: `${keyId}_${i}`,
      action: entryAction,
      outcome: entryOutcome,
      actor: "[redacted]",
      timestamp: new Date(now - i * 60 * 60 * 1000).toISOString(),
    });
  }
  return entries;
}

export async function GET(request: Request) {
  const correlationId = newCorrelationId();

  if (!isAuthorized(request)) {
    return errorResponse(
      401,
      ERROR_CODES.UNAUTHORIZED,
      "A valid owner, API key, or JWT credential is required.",
      correlationId,
    );
  }

  const { searchParams } = new URL(request.url);
  const days = parseRangeDays(searchParams.get("days"));
  if (days === null) {
    return errorResponse(
      400,
      ERROR_CODES.INVALID_RANGE,
      `days must be an integer between 1 and ${MAX_RANGE_DAYS}.`,
      correlationId,
    );
  }

  const keyId = searchParams.get("id");
  if (keyId !== null && !mockApiKeys.some((key) => key.id === keyId)) {
    return errorResponse(
      404,
      ERROR_CODES.NOT_FOUND,
      "API key not found.",
      correlationId,
    );
  }

  const keys = keyId
    ? mockApiKeys.filter((key) => key.id === keyId)
    : mockApiKeys;

  // Analytics reads surface actionable errors instead of leaking upstream detail.
  if (keys.length === 0) {
    return errorResponse(
      503,
      ERROR_CODES.UPSTREAM_UNAVAILABLE,
      "Usage analytics are temporarily unavailable. Please retry.",
      correlationId,
    );
  }

  const series = keys.map((key) => ({
    id: key.id,
    name: key.name,
    points: usageSeries(key.id, days),
  }));

  // Audit log filters are opt-in via ?audit=true so existing analytics consumers
  // keep their current response shape.
  if (searchParams.get("audit") === "true") {
    const filters = parseAuditFilters(searchParams);
    if (filters === null) {
      return errorResponse(
        400,
        ERROR_CODES.INVALID_FILTER,
        "action, outcome, and limit must be within the allowed audit filter values.",
        correlationId,
      );
    }

    const audit = keys.map((key) => ({
      id: key.id,
      name: key.name,
      entries: auditEntries(
        key.id,
        filters.action,
        filters.outcome,
        filters.limit,
      ),
    }));

    return NextResponse.json({ correlationId, series, audit });
  }

  return NextResponse.json({ correlationId, series });
}

export async function POST(request: Request) {
  const correlationId = newCorrelationId();

  if (!isAuthorized(request)) {
    return errorResponse(
      401,
      ERROR_CODES.UNAUTHORIZED,
      "A valid owner, API key, or JWT credential is required.",
      correlationId,
    );
  }

  // Idempotency: replaying a request with the same key returns the 

/* … truncated 2027 chars — edit only what you need near the top … */
