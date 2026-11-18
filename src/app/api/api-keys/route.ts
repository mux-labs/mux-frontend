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

// Persistent key store for the authenticated owner. Rotate/revoke resolve and
// mutate targets here rather than against the mock list, which is test-only.
type StoredApiKey = {
  id: string;
  name: string;
  owner: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

const keyStore = new Map<string, StoredApiKey>();

function ownerFromRequest(request: Request): string | null {
  const owner = request.headers.get("x-owner-id")?.trim();
  return owner && owner.length > 0 ? owner : null;
}

function findOwnedKey(owner: string, keyId: string): StoredApiKey | null {
  const key = keyStore.get(keyId);
  if (!key || key.owner !== owner) return null;
  return key;
}

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

  const owner = ownerFromRequest(request);
  if (owner === null) {
    return errorResponse(
      401,
      ERROR_CODES.UNAUTHORIZED,
      "A valid owner credential is required.",
      correlationId,
    );
  }

  // Idempotency: replaying a request with the same idempotency key returns the
  // cached response instead of re-running a privileged write.
  const idempotencyKey = parseIdempotencyKey(request);
  if (idempotencyKey !== null) {
    const cached = idempotencyCache.get(`${owner}:${idempotencyKey}`);
    if (cached) {
      return NextResponse.json(cached.body, { status: cached.status });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      400,
      ERROR_CODES.INVALID_BODY,
      "Request body must be valid JSON.",
      correlationId,
    );
  }

  if (typeof body !== "object" || body === null) {
    return errorResponse(
      400,
      ERROR_CODES.INVALID_BODY,
      "Request body must be a JSON object.",
      correlationId,
    );
  }

  const { action, id, name, confirm } = body as {
    action?: unknown;
    id?: unknown;
    name?: unknown;
    confirm?: unknown;
  };

  if (
    action !== "create" &&
    action !== "rotate" &&
    action !== "revoke"
  ) {
    return errorResponse(
      400,
      ERROR_CODES.INVALID_ACTION,
      "action must be one of create, rotate, revoke.",
      correlationId,
    );
  }

  const typedAction = action as ApiKeyAction;

  // Destructive actions require an explicit confirmation flag.
  if (DESTRUCTIVE_ACTIONS.includes(typedAction) && confirm !== true) {
    return errorResponse(
      400,
      ERROR_CODES.CONFIRMATION_REQUIRED,
      "confirm: true is required for rotate and revoke.",
      correlationId,
    );
  }

  if (typedAction === "create") {
    if (typeof name !== "string" || name.trim().length === 0) {
      return errorResponse(
        400,
        ERROR_CODES.INVALID_BODY,
        "name is required to create an API key.",
        correlationId,
      );
    }
    const created: StoredApiKey = {
      id: `key_${crypto.randomUUID()}`,
      name: name.trim(),
      owner,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      revokedAt: null,
    };
    keyStore.set(created.id, created);
    const responseBody = { correlationId, key: redact(created) };
    if (idempotencyKey !== null) {
      idempotencyCache.set(`${owner}:${idempotencyKey}`, {
        status: 201,
        body: responseBody,
      });
    }
    return NextResponse.json(responseBody, { status: 201 });
  }

  // rotate/revoke resolve the target against the persistent store for the
  // authenticated owner; mock keys are never consulted here.
  if (typeof id !== "string" || id.trim().length === 0) {
    return errorResponse(
      400,
      ERROR_CODES.INVALID_BODY,
      "id is required for rotate and revoke.",
      correlationId,
    );
  }

  const target = findOwnedKey(owner, id);
  if (target === null) {
    return errorResponse(
      404,
      ERROR_CODES.NOT_FOUND,
      "API key not found.",
      correlationId,
    );
  }

  if (typedAction === "revoke") {
    target.revokedAt = new Date().toISOString();
    keyStore.set(target.id, target);
    const responseBody = { correlationId, key: redact(target) };
    if (idempotencyKey !== null) {
      idempotencyCache.set(`${owner}:${idempotencyKey}`, {
        status: 200,
        body: responseBody,
      });
    }
    return NextResponse.json(responseBody);
  }

  // rotate: issue a fresh id for the same owner and retire the old key.
  target.revokedAt = new Date().toISOString();
  keyStore.set(target.id, target);
  const rotated: StoredApiKey = {
    id: `key_${crypto.randomUUID()}`,
    name: target.name,
    owner,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revokedAt: null,
  };
  keyStore.set(rotated.id, rotated);
  const responseBody = { correlationId, key: redact(rotated) };
  if (idempotencyKey !== null) {
    idempotencyCache.set(`${owner}:${idempotencyKey}`, {
      status: 200,
      body: responseBody,
    });
  }
  return NextResponse.json(responseBody);
}
