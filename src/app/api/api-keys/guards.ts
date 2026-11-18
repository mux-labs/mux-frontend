/**
 * Security guards for the /api/api-keys route.
 *
 * Kept outside route.ts so they can be unit-tested directly: Next.js only
 * allows HTTP handlers and route config to be exported from a route module.
 */

// Never echo raw key material, JWTs, or secrets back to clients or logs.
export function redact(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "[redacted]";
  return `[redacted:${value.length}]`;
}

// Deny-by-default: analytics is a privileged surface. Require an owner/API-key/JWT
// credential before returning any per-key usage data. Scheme matching is
// intentionally case-sensitive.
export function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  if (!auth) return false;
  const [scheme, token] = auth.split(" ");
  if (!token) return false;
  return scheme === "Bearer" || scheme === "ApiKey";
}

// Roles a verified credential may assert. Anything else is denied.
export const ALLOWED_ROLES = ["owner", "delegate", "guardian"] as const;
export type AuthRole = (typeof ALLOWED_ROLES)[number];

// Claims that must come from a verified credential, never from client headers.
export interface VerifiedClaims {
  subject: string;
  role: AuthRole;
  ownerScopes: string[];
}

export interface AuthContext {
  subject: string;
  role: AuthRole;
  ownerScopes: string[];
}

/**
 * Verifies the presented credential and returns its claims, or null when the
 * credential is missing or cannot be verified. This is the seam where a real
 * signature check (JWT/API-key verification) belongs; until a credential is
 * verified, no claims are trusted.
 */
export function verifyCredential(request: Request): VerifiedClaims | null {
  const auth = request.headers.get("authorization");
  const apiKey = request.headers.get("x-api-key");
  if (!auth && !apiKey) return null;

  // Placeholder seam: no signature verification is wired up yet, so every
  // presented credential is treated as unverified and denied.
  return null;
}

/**
 * Resolves the caller's auth context from the verified credential only.
 * Client-supplied `x-subject`, `x-role`, and `x-owner-scopes` headers are
 * ignored. Deny-by-default for a missing/unverified credential and for a role
 * outside owner/delegate/guardian.
 */
export function resolveAuthContext(request: Request): AuthContext | null {
  const claims = verifyCredential(request);
  if (!claims) return null;

  if (!(ALLOWED_ROLES as readonly string[]).includes(claims.role)) return null;
  if (typeof claims.subject !== "string" || claims.subject.length === 0) return null;
  if (!Array.isArray(claims.ownerScopes)) return null;

  return {
    subject: claims.subject,
    role: claims.role,
    ownerScopes: claims.ownerScopes,
  };
}

/**
 * Owner-scope allow list check. Scopes come from the verified credential, so a
 * caller cannot widen its own access via request headers.
 */
export function isAuthorizedForOwner(context: AuthContext | null, ownerId: string): boolean {
  if (!context) return false;
  if (typeof ownerId !== "string" || ownerId.length === 0) return false;
  return context.ownerScopes.includes(ownerId);
}

// ---------------------------------------------------------------------------
// Idempotency guards for API-key writes.
//
// A write is only replayable when the caller presents a well-formed key. Blank
// or oversized keys are rejected with 400 before any write happens, so a client
// that sends a bad key never gets a silent second write on retry. The raw key is
// never logged or echoed back.
// ---------------------------------------------------------------------------

export const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

export type IdempotencyKeyResult =
  | { ok: true; key: string }
  | { ok: false; reason: "missing" | "blank" | "oversized" };

/**
 * Validates the `Idempotency-Key` header. Returns a discriminated result so the
 * handler can distinguish a missing key (explicit one-shot, documented in the
 * handler) from a blank/oversized key (400, no write).
 */
export function parseIdempotencyKey(request: Request): IdempotencyKeyResult {
  const raw = request.headers.get("idempotency-key");
  if (raw === null) return { ok: false, reason: "missing" };

  const key = raw.trim();
  if (key.length === 0) return { ok: false, reason: "blank" };
  if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) return { ok: false, reason: "oversized" };

  return { ok: true, key };
}

/**
 * A stored idempotent response. Scoped by caller and body hash so a replay only
 * returns the stored response when the same caller repeats the same request.
 */
export interface IdempotencyRecord {
  caller: string;
  bodyHash: string;
  status: number;
  body: unknown;
}

/**
 * Durable idempotency store. Implementations must survive another instance
 * (e.g. a shared database or cache), unlike a module-level Map. Keys are
 * namespaced by caller so two users cannot share one entry.
 */
export interface IdempotencyStore {
  get(caller: string, key: string): Promise<IdempotencyRecord | null>;
  put(caller: string, key: string, record: IdempotencyRecord): Promise<void>;
}

/**
 * Computes a stable hash of the request body so a replay with a different body
 * is not treated as the same request. Uses Web Crypto (available in the Next.js
 * runtime) and never exposes the raw body.
 */
export async function hashBody(body: string): Promise<string> {
  const data = new TextEncoder().encode(body);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Looks up a prior response for this caller/key and returns it only when the
 * stored body hash matches the current request. A mismatch (same key, different
 * body/action) is treated as a conflict and returns null so the caller does not
 * receive the first action's body.
 */
export async function findReplay(
  store: IdempotencyStore,
  caller: string,
  key: string,
  bodyHash: string,
): Promise<IdempotencyRecord | null> {
  const record = await store.get(caller, key);
  if (!record) return null;
  if (record.caller !== caller) return null;
  if (record.bodyHash !== bodyHash) return null;
  return record;
}
