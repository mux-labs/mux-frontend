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
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-user', role: 'admin' } }, error: null });

    const res = await POST(
      makeRequest({ name: 'a'.repeat(129), email: 'ada@example.com', role: 'developer' }),
    );

    expect(res.status).toBe(400);
  });

  it('adds a member when called by an admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-user', role: 'admin' } }, error: null });
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const res = await POST(
      makeRequest({ name: 'Carol New', email: 'carol@muxprotocol.com', role: 'developer' }),
    );

    expect(res.status).toBe(201);
  });

  it('is idempotent on email', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-user', role: 'admin' } }, error: null });
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const body = { name: 'Carol New', email: 'carol@muxprotocol.com', role: 'developer' };

    const first = await POST(makeRequest(body));
    expect(first.status).toBe(201);

    const second = await POST(makeRequest(body));
    expect(second.status).toBe(200);
  });

  it('rejects non-admin callers', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'dev-user', role: 'developer' } }, error: null });

    const res = await POST(
      makeRequest({ name: 'Carol New', email: 'carol@muxprotocol.com', role: 'developer' }),
    );

    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated callers', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await POST(
      makeRequest({ name: 'Carol New', email: 'carol@muxprotocol.com', role: 'developer' }),
    );

    expect(res.status).toBe(401);
  });
  });
});
