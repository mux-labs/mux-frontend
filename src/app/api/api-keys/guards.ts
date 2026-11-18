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
