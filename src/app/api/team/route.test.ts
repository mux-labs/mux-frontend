import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from './route';

function makeRequest(
  method: 'GET' | 'POST',
  options: { headers?: Record<string, string>; body?: string } = {},
): NextRequest {
  return new NextRequest('http://localhost/api/team', {
    method,
    headers: options.headers,
    body: options.body,
  });
}

const adminHeaders = {
  authorization: 'Bearer admin-token',
};

const developerHeaders = {
  authorization: 'Bearer developer-token',
};

describe('/api/team route', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('GET', () => {
    it('returns 401 unauthorized when Authorization is missing', async () => {
      const response = await GET(makeRequest('GET'));
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe('unauthorized');
      expect(response.headers.get('x-correlation-id')).toBeTruthy();
    });

    it('returns 401 unauthorized for an invalid Authorization scheme', async () => {
      const response = await GET(
        makeRequest('GET', { headers: { authorization: 'Basic x', 'x-role': 'admin' } }),
      );
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe('unauthorized');
    });

    it('returns 401 unauthorized for an unverifiable bearer token even with x-role admin', async () => {
      const response = await GET(
        makeRequest('GET', { headers: { authorization: 'Bearer x', 'x-role': 'admin' } }),
      );
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe('unauthorized');
    });

    it('returns 200 with the member list for an authorized caller', async () => {
      const response = await GET(makeRequest('GET', { headers: adminHeaders }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(body.members)).toBe(true);
      expect(response.headers.get('x-correlation-id')).toBeTruthy();
    });

    it('returns 503 backend_unavailable when NODE_ENV is production', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const response = await GET(makeRequest('GET', { headers: adminHeaders }));
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.error.code).toBe('backend_unavailable');
    });

    it('returns 401 before 503 in production for an unverifiable token', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const response = await GET(
        makeRequest('GET', { headers: { authorization: 'Bearer x', 'x-role': 'admin' } }),
      );
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe('unauthorized');
    });
  });

  describe('POST', () => {
    it('returns 401 unauthorized when Authorization is missing', async () => {
      const response = await POST(
        makeRequest('POST', {
          body: JSON.stringify({ name: 'Ada', email: 'ada@example.com', role: 'admin' }),
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe('unauthorized');
      expect(response.headers.get('x-correlation-id')).toBeTruthy();
    });

    it('returns 401 unauthorized for an unverifiable bearer token even with x-role admin', async () => {
      const response = await POST(
        makeRequest('POST', {
          headers: { authorization: 'Bearer x', 'x-role': 'admin' },
          body: JSON.stringify({ name: 'Ada', email: 'ada@example.com', role: 'admin' }),
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe('unauthorized');
    });

    it('returns 403 forbidden when a developer calls POST', async () => {
      const response = await POST(
        makeRequest('POST', {
          headers: developerHeaders,
          body: JSON.stringify({ name: 'Ada', email: 'ada@example.com', role: 'admin' }),
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error.code).toBe('forbidden');
    });

    it('returns 400 invalid_member for a non-JSON body', async () => {
      const response = await POST(
        makeRequest('POST', { headers: adminHeaders, body: 'not-json' }),
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('invalid_member');
    });

    it('returns 400 invalid_member for an empty name', async () => {
      const response = await POST(
        makeRequest('POST', {
          headers: adminHeaders,
          body: JSON.stringify({ name: '', email: 'ada@example.com', role: 'admin' }),
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('invalid_member');
    });

    it('returns 400 invalid_member for an oversized name', async () => {
      const response = await POST(
        makeRequest('POST', {
          headers: adminHeaders,
          body: JSON.stringify({ name: 'a'.repeat(129), email: 'ada@example.com', role: 'admin' }),
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('invalid_member');
    });

    it('returns 400 invalid_member for an email without @', async () => {
      const response = await POST(
        makeRequest('POST', {
          headers: adminHeaders,
          body: JSON.stringify({ name: 'Ada', email: 'ada.example.com', role: 'admin' }),
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('invalid_member');
    });

    it('returns 400 invalid_member for an unknown role', async () => {
      const response = await POST(
        makeRequest('POST', {
          headers: adminHeaders,
          body: JSON.stringify({ name: 'Ada', email: 'ada@example.com', role: 'owner' }),
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('invalid_member');
    });

    it('is idempotent when re-adding an existing email', async () => {
      const payload = JSON.stringify({
        name: 'Ada',
        email: 'ada@example.com',
        role: 'developer',
      });

      const first = await POST(makeRequest('POST', { headers: adminHeaders, body: payload }));
      expect(first.status).toBe(200);

      const before = await GET(makeRequest('GET', { headers: adminHeaders }));
      const beforeBody = await before.json();

      const second = await POST(makeRequest('POST', { headers: adminHeaders, body: payload }));
      expect(second.status).toBe(200);

      const after = await GET(makeRequest('GET', { headers: adminHeaders }));
      const afterBody = await after.json();

      expect(afterBody.members.length).toBe(beforeBody.members.length);
    });

    it('generates distinct member ids for two adds in the same millisecond', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

      const first = await POST(
        makeRequest('POST', {
          headers: adminHeaders,
          body: JSON.stringify({ name: 'Ada', email: 'ada@example.com', role: 'developer' }),
        }),
      );
      expect(first.status).toBe(200);
      const firstBody = await first.json();

      const second = await POST(
        makeRequest('POST', {
          headers: adminHeaders,
          body: JSON.stringify({ name: 'Grace', email: 'grace@example.com', role: 'developer' }),
        }),
      );
      expect(second.status).toBe(200);
      const secondBody = await second.json();

      expect(firstBody.member.id).toBeTruthy();
      expect(secondBody.member.id).toBeTruthy();
      expect(firstBody.member.id).not.toBe(secondBody.member.id);
    });

    it('returns 503 backend_unavailable when NODE_ENV is production', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const response = await POST(
        makeRequest('POST', {
          headers: adminHeaders,
          body: JSON.stringify({ name: 'Ada', email: 'ada@example.com', role: 'admin' }),
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.error.code).toBe('backend_unavailable');
    });

    it('returns 401 before 503 in production for an unverifiable token', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const response = await POST(
        makeRequest('POST', {
          headers: { authorization: 'Bearer x', 'x-role': 'admin' },
          body: JSON.stringify({ name: 'Ada', email: 'ada@example.com', role: 'admin' }),
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe('unauthorized');
    });
  });
});
