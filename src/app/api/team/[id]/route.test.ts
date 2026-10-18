import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { DELETE } from './route';
import { mockTeam } from '../route';

const URL = 'http://localhost/api/team/abc';

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(URL, { method: 'DELETE', headers });
}

const adminHeaders = {
  authorization: 'Bearer test-token',
  'x-role': 'admin',
};

const developerHeaders = {
  authorization: 'Bearer test-token',
  'x-role': 'developer',
};

describe('DELETE /api/team/[id]', () => {
  beforeEach(() => {
    // Reset the shared mock store to a known state before each test.
    mockTeam.length = 0;
    mockTeam.push({
      id: 'member-1',
      name: 'Alice Admin',
      email: 'alice@muxprotocol.com',
      role: 'admin',
      addedAt: new Date().toISOString(),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns 401 when the authorization header is missing', async () => {
    const res = await DELETE(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('unauthorized');
  });

  it('returns 401 for a non-Bearer/ApiKey scheme', async () => {
    const res = await DELETE(
      makeRequest({ authorization: 'Basic abc123', 'x-role': 'admin' }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('unauthorized');
  });

  it('returns 403 for a developer role', async () => {
    const res = await DELETE(makeRequest(developerHeaders));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('forbidden');
  });

  it('returns 200 and removes the member for an admin role', async () => {
    const res = await DELETE(makeRequest(adminHeaders));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.removed).toBe(true);
    expect(mockTeam.find((m) => m.id === 'member-1')).toBeUndefined();
  });

  it('returns 503 backend_unavailable when NODE_ENV is production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = await DELETE(makeRequest(adminHeaders));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe('backend_unavailable');
  });

  it('returns 503 backend_unavailable when the mock store is undefined', async () => {
    vi.resetModules();
    vi.doMock('../route', () => ({ mockTeam: undefined }));
    const { DELETE: isolatedDelete } = await import('./route');
    const res = await isolatedDelete(makeRequest(adminHeaders));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe('backend_unavailable');
    vi.doUnmock('../route');
  });

  it('returns 200 with { removed: true } for an unknown id (idempotent)', async () => {
    const res = await DELETE(makeRequest(adminHeaders));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.removed).toBe(true);

    // Deleting again (already removed) must not throw and stays idempotent.
    const again = await DELETE(makeRequest(adminHeaders));
    expect(again.status).toBe(200);
    const againBody = await again.json();
    expect(againBody.removed).toBe(true);
  });

  it('echoes the supplied x-correlation-id header', async () => {
    const res = await DELETE(
      makeRequest({ ...adminHeaders, 'x-correlation-id': 'corr-123' }),
    );
    expect(res.headers.get('x-correlation-id')).toBe('corr-123');
  });

  it('generates an x-correlation-id when none is supplied', async () => {
    const res = await DELETE(makeRequest(adminHeaders));
    const correlationId = res.headers.get('x-correlation-id');
    expect(correlationId).toBeTruthy();
    expect(typeof correlationId).toBe('string');
  });
});
