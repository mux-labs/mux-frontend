import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST } from './route';
import { issueToken, mockTeam, resetMockTeam } from './store';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

function adminRequest(body: unknown): Request {
  const token = issueToken('admin-user', 'admin');
  return new Request('http://localhost/api/team', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/team', () => {
  beforeEach(() => {
    resetMockTeam();
  });

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  });

  it('refuses writes in production with 503 and leaves the member list unchanged', async () => {
    process.env.NODE_ENV = 'production';
    const before = mockTeam.map((member) => ({ ...member }));

    const response = await POST(
      adminRequest({
        name: 'Carol New',
        email: 'carol@muxprotocol.com',
        role: 'developer',
      }),
    );

    expect(response.status).toBe(503);
    const payload = await response.json();
    expect(payload.error).toBe('backend_unavailable');
    expect(mockTeam).toEqual(before);
  });
});
