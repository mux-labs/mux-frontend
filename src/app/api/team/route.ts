import { NextRequest, NextResponse } from 'next/server';

import { randomUUID } from 'crypto';

type MemberRole = 'admin' | 'developer';

type Member = {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
};

const members: Member[] = [
  { id: 'm-1', name: 'Ada Lovelace', email: 'ada@mux.test', role: 'admin' },
  { id: 'm-2', name: 'Grace Hopper', email: 'grace@mux.test', role: 'developer' },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function correlationId(request: NextRequest): string {
  return request.headers.get('x-correlation-id') ?? randomUUID();
}

function errorResponse(
  request: NextRequest,
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { 'x-correlation-id': correlationId(request) } },
  );
}

function isAuthorized(request: NextRequest): boolean {
  const header = request.headers.get('authorization');
  return typeof header === 'string' && header.startsWith('Bearer ');
}

function isAdmin(request: NextRequest): boolean {
  return request.headers.get('x-role') === 'admin';
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function validateMemberPayload(
  payload: unknown,
): { ok: true; member: Omit<Member, 'id'> } | { ok: false } {
  if (typeof payload !== 'object' || payload === null) {
    return { ok: false };
  }

  const { name, email, role } = payload as Record<string, unknown>;

  if (typeof name !== 'string') {
    return { ok: false };
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0 || trimmedName.length > 128) {
    return { ok: false };
  }

  if (typeof email !== 'string') {
    return { ok: false };
  }

  const trimmedEmail = email.trim();
  if (trimmedEmail.length > 254 || !EMAIL_PATTERN.test(trimmedEmail)) {
    return { ok: false };
  }

  if (role !== 'admin' && role !== 'developer') {
    return { ok: false };
  }

  return { ok: true, member: { name: trimmedName, email: trimmedEmail, role } };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return errorResponse(request, 401, 'unauthorized', 'Missing or invalid Authorization header.');
  }

  if (isProduction()) {
    return errorResponse(request, 503, 'backend_unavailable', 'Team backend is unavailable.');
  }

  return NextResponse.json(
    { members },
    { status: 200, headers: { 'x-correlation-id': correlationId(request) } },
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return errorResponse(request, 401, 'unauthorized', 'Missing or invalid Authorization header.');
  }

  if (!isAdmin(request)) {
    return errorResponse(request, 403, 'forbidden', 'Only admins may add team members.');
  }

  if (isProduction()) {
    return errorResponse(request, 503, 'backend_unavailable', 'Team backend is unavailable.');
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(request, 400, 'invalid_member', 'Request body must be valid JSON.');
  }

  const result = validateMemberPayload(payload);
  if (!result.ok) {
    return errorResponse(request, 400, 'invalid_member', 'Member payload is invalid.');
  }

  const existing = members.find((member) => member.email === result.member.email);
  if (existing) {
    return NextResponse.json(
      { member: existing },
      { status: 200, headers: { 'x-correlation-id': correlationId(request) } },
    );
  }

  const member: Member = { id: randomUUID(), ...result.member };
  members.push(member);

  return NextResponse.json(
    { member },
    { status: 200, headers: { 'x-correlation-id': correlationId(request) } },
  );
}
