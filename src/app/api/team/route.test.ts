import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import { POST } from './route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/team', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/team', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await POST(makeRequest({ name: 'Ada', email: 'ada@example.com', role: 'developer' }));

    expect(res.status).toBe(401);
  });

  it('rejects a name longer than 128 characters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: {
  });
}

describe('POST /api/team', () => {
  beforeEach(() => {
    resetMockTeam();
  });

  it('adds a member when called by an admin', async () => {
    const token = issueToken('admin-user', 'admin');
    const before = mockTeam.length;

    const res = await POST(
      postRequest({ name: 'Carol New', email: 'carol@muxprotocol.com', role: 'developer' }, token),
    );

    expect(res.status).toBe(201);
    expect(mockTeam.length).toBe(before + 1);
    const added = mockTeam.find((m) => m.email === 'carol@muxprotocol.com');
    expect(added).toBeDefined();
    expect(added?.name).toBe('Carol New');
    expect(added?.role).toBe('developer');
  });

  it('is idempotent on email', async () => {
    const token = issueToken('admin-user', 'admin');
    const body = { name: 'Carol New', email: 'carol@muxprotocol.com', role: 'developer' };

    const first = await POST(postRequest(body, token));
    expect(first.status).toBe(201);
    const afterFirst = mockTeam.length;

    const second = await POST(postRequest(body, token));
    expect(second.status).toBe(200);
    expect(mockTeam.length).toBe(afterFirst);
    expect(mockTeam.filter((m) => m.email === 'carol@muxprotocol.com')).toHaveLength(1);
  });

  it('rejects non-admin callers', async () => {
    const token = issueToken('dev-user', 'developer');
    const before = mockTeam.length;

    const res = await POST(
      postRequest({ name: 'Carol New', email: 'carol@muxprotocol.com', role: 'developer' }, token),
    );

    expect(res.status).toBe(403);
    expect(mockTeam.length).toBe(before);
    expect(mockTeam.find((m) => m.email === 'carol@muxprotocol.com')).toBeUndefined();
  });

  it('rejects unauthenticated callers', async () => {
    const before = mockTeam.length;

    const res = await POST(
      postRequest({ name: 'Carol New', email: 'carol@muxprotocol.com', role: 'developer' }),
    );

    expect(res.status).toBe(401);
    expect(mockTeam.length).toBe(before);
  });
});
