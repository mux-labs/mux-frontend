import { NextRequest, NextResponse } from 'next/server';
import { mockTeam } from '../store';

export const runtime = 'nodejs';

const TEAM_ERROR = {
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
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
function resolveCallerRole(req: NextRequest): 'admin' | 'developer' | null {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const [scheme, token] = auth.split(' ');
  if (!token || (scheme !== 'Bearer' && scheme !== 'ApiKey')) return null;
  const role = req.headers.get('x-role');
  if (role !== 'admin' && role !== 'developer') return null;
  return role;
}

/** DELETE /api/team/[id] — remove a member. admin only. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const correlationId = req.headers.get('x-correlation-id') ?? newCorrelationId();

  const callerRole = resolveCallerRole(req);
  if (!callerRole) {
    return errorResponse(401, TEAM_ERROR.UNAUTHORIZED, 'Authentication required.', correlationId);
  }
  if (callerRole !== 'admin') {
    return errorResponse(403, TEAM_ERROR.FORBIDDEN, 'Only admins may remove team members.', correlationId);
  }

  if (!isMockAllowed() || !Array.isArray(mockTeam)) {
    return errorResponse(503, TEAM_ERROR.BACKEND_UNAVAILABLE, 'Team backend not configured.', correlationId);
  }

  const { id } = await params;
  const index = mockTeam.findIndex((m) => m.id === id);
  if (index === -1) {
    return errorResponse(404, TEAM_ERROR.NOT_FOUND, 'Team member not found.', correlationId);
  }

  const [removed] = mockTeam.splice(index, 1);

  return NextResponse.json(
    { member: removed, correlationId },
    { headers: { 'x-correlation-id': correlationId } },
  );
}
