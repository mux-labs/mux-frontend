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
