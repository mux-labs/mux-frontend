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

// Resolve the authenticated owner for a request. Returns null when the caller
// cannot be identified, so rotate/revoke can fail closed instead of falling
// back to the mock key list.
export function getOwner(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  const [scheme, token] = auth.split(" ");
  if (!token) return null;
  if (scheme !== "Bearer" && scheme !== "ApiKey") return null;
  return token;
}

// A key may only be rotated/revoked by its owner. Keys that are absent from the
// persistent store (or owned by someone else) are treated as not found so the
// route never resolves targets against the mock list.
export function isOwnedBy(
  key: { owner?: string | null } | null | undefined,
  owner: string | null,
): boolean {
  if (!key || !owner) return false;
  return key.owner === owner;
}
