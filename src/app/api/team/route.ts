import { NextRequest, NextResponse } from 'next/server';
import { mockTeam, type TeamMember, type TeamRole } from './store';

export const runtime = 'nodejs';

export type { TeamMember, TeamRole } from './store';
export { mockTeam } from './store';

const TEAM_ERROR = {
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  INVALID_MEMBER: 'invalid_member',
  MEMBER_EXISTS: 'member_exists',
  NOT_FOUND: 'not_found',
  BACKEND_UNAVAILABLE: 'backend_unavailable',
} as const;

type TeamErrorCode = (typeof TEAM_ERROR)[keyof typeof TEAM_ERROR];


function isMockAllowed(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function newCorrelationId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `team_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function errorResponse(
  status: number,
  code: TeamErrorCode,
  message: string,
  correlationId: string,
) {
  return NextResponse.json(
    { error: { code, message, correlationId } },
    { status, headers: { 'x-correlation-id': correlationId } },
  );
}

/** Resolve caller role from the session/JWT. Deny-by-default: null = unauthorized. */
function resolveCallerRole(req: NextRequest): TeamRole | null {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const [scheme, token] = auth.split(' ');
  if (!token || (scheme !== 'Bearer' && scheme !== 'ApiKey')) return null;
  // Placeholder: real impl validates JWT/API-key and returns the resolved role.
  const role = req.headers.get('x-role') as TeamRole | null;
  if (role !== 'admin' && role !== 'developer') return null;
  return role;
}

function validateMemberPayload(body: unknown): {
  name: string;
  email: string;
  role: TeamRole;
} | null {
  if (!body || typeof body !== 'object') return null;
  const { name, email, role } = body as Record<string, unknown>;
  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 128) return null;
  if (typeof email !== 'string' || !email.includes('@') || email.length > 254) return null;
  if (role !== 'admin' && role !== 'developer') return null;
  return { name: name.trim(), email: email.trim().toLowerCase(), role };
}

/** GET /api/team — list members. admin and developer may read. */
export async function GET(req: NextRequest) {
  const correlationId = req.headers.get('x-correlation-id') ?? newCorrelationId();

  const callerRole = resolveCallerRole(req);
  if (!callerRole) {
    return errorResponse(401, TEAM_ERROR.UNAUTHORIZED, 'Authentication required.', correlationId);
  }

  if (!isMockAllowed()) {
    return errorResponse(503, TEAM_ERROR.BACKEND_UNAVAILABLE, 'Team backend not configured.', correlationId);
  }

  return NextResponse.json(
    { members: mockTeam, correlationId },
    { headers: { 'x-correlation-id': correlationId } },
  );
}

/** POST /api/team — add a member. admin only. Idempotent on email. */
export async function POST(req: NextRequest) {
  const correlationId = req.headers.get('x-correlation-id') ?? newCorrelationId();

  const callerRole = resolveCallerRole(req);
  if (!callerRole) {
    return errorResponse(401, TEAM_ERROR.UNAUTHORIZED, 'Authentication required.', correlationId);
  }
  if (callerRole !== 'admin') {
    return errorResponse(403, TEAM_ERROR.FORBIDDEN, 'Only admins may add team members.', correlationId);
  }

  if (!isMockAllowed()) {
    return errorResponse(503, TEAM_ERROR.BACKEND_UNAVAILABLE, 'Team backend not configured.', correlationId);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorResponse(400, TEAM_ERROR.INVALID_MEMBER, 'Request body must be valid JSON.', correlationId);
  }

  const payload = validateMemberPayload(raw);
  if (!payload) {
    return errorResponse(400, TEAM_ERROR.INVALID_MEMBER, 'name, email, and role (admin|developer) are required.', correlationId);
  }

  // Idempotent: re-adding an existing email is a no-op success.
  const existing = mockTeam.find((m) => m.email === payload.email);
  if (existing) {
    if (existing.role !== payload.role) {
      return errorResponse(409, TEAM_ERROR.MEMBER_EXISTS, 'A member with this email already exists with a different role.', correlationId);
    }
    return NextResponse.json(
      { member: existing, replayed: true, correlationId },
      { status: 200, headers: { 'x-correlation-id': correlationId } },
    );
  }

  const member: TeamMember = {
    id: `member-${Date.now().toString(36)}`,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    addedAt: new Date().toISOString(),
  };
  mockTeam.push(member);

  return NextResponse.json(
    { member, replayed: false, correlationId },
    { status: 201, headers: { 'x-correlation-id': correlationId } },
  );
}
