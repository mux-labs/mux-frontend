export type TeamRole = 'admin' | 'developer';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  addedAt: string;
}

export interface VerifiedCaller {
  role: TeamRole;
  subject: string;
}

function seedTeam(): TeamMember[] {
  return [
    {
      id: 'member-1',
      name: 'Alice Admin',
      email: 'alice@muxprotocol.com',
      role: 'admin',
      addedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'member-2',
      name: 'Bob Dev',
      email: 'bob@muxprotocol.com',
      role: 'developer',
      addedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

// In-memory mock store for local dev / CI (never used in production).
export const mockTeam: TeamMember[] = seedTeam();

/** Reset the mock store to its seed state. Intended for tests. */
export function resetMockTeam(): void {
  mockTeam.length = 0;
  mockTeam.push(...seedTeam());
}

/**
 * Verify the caller's bearer token and derive their role from the token itself.
 *
 * The `x-role` header is intentionally ignored: it is caller-controlled and must
 * never influence authorization. Returns `null` when the token is missing or
 * does not verify, so callers can respond with 401.
 */
export function verifyCallerToken(request: Request): VerifiedCaller | null {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;

  const [scheme, token] = authorization.split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer' && scheme.toLowerCase() !== 'apikey') {
    return null;
  }

  const verified = verifyToken(token);
  if (!verified) return null;

  return verified;
}

/**
 * Verify a raw token and return the caller identity it encodes.
 *
 * A real implementation would validate the JWT signature / API key against the
 * auth service. Until that exists, only tokens issued by this module verify.
 */
function verifyToken(token: string): VerifiedCaller | null {
  const issued = issuedTokens.get(token);
  if (!issued) return null;
  if (issued.expiresAt <= Date.now()) {
    issuedTokens.delete(token);
    return null;
  }
  return { role: issued.role, subject: issued.subject };
}

interface IssuedToken {
  role: TeamRole;
  subject: string;
  expiresAt: number;
}

const issuedTokens = new Map<string, IssuedToken>();

/** Issue a token bound to a role. Intended for tests and the auth service. */
export function issueToken(subject: string, role: TeamRole, ttlMs = 60 * 60 * 1000): string {
  const token = `tok_${role}_${subject}_${Math.random().toString(36).slice(2)}`;
  issuedTokens.set(token, { role, subject, expiresAt: Date.now() + ttlMs });
  return token;
}
