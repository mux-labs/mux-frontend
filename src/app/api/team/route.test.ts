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
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const res = await POST(
      makeRequest({ name: 'a'.repeat(129), email: 'ada@example.com', role: 'developer' })
    );

    expect(res.status).toBe(400);
  });

  it('accepts a name of exactly 128 characters with a valid email and role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'member-1' }, error: null }),
        }),
      }),
    });

    const res = await POST(
      makeRequest({ name: 'a'.repeat(128), email: 'ada@example.com', role: 'developer' })
    );

    expect(res.status).toBe(201);
  });

  it('rejects a role other than admin or developer', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const res = await POST(
      makeRequest({ name: 'Ada', email: 'ada@example.com', role: 'owner' })
    );

    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('accepts a developer role with a valid email and name', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'member-1' }, error: null }),
        }),
      }),
    });

    const res = await POST(
      makeRequest({ name: 'Ada', email: 'ada@example.com', role: 'developer' })
    );

    expect(res.status).toBe(201);
  });
});
