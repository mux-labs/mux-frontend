// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';

import { GET, PATCH, DELETE, resolveCallerRole } from './route';

const MEMBER_ID = 'member-1';
const BASE_URL = `http://localhost/api/team/${MEMBER_ID}`;

const ADMIN_HEADERS = {
  authorization: 'Bearer test-token',
  'x-role': 'admin',
};

const DEVELOPER_HEADERS = {
  authorization: 'Bearer test-token',
  'x-role': 'developer',
};

function makeRequest(
  method: string,
  headers: Record<string, string> = {},
  body?: unknown,
) {
  return new NextRequest(BASE_URL, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const params = { params: { id: MEMBER_ID } };

const MUTATION_BODY = { role: 'admin' };

describe('resolveCallerRole', () => {
  it('resolves the caller role from the session/JWT', () => {
    expect(resolveCallerRole(makeRequest('GET', ADMIN_HEADERS))).toBe('admin');
    expect(resolveCallerRole(makeRequest('GET', DEVELOPER_HEADERS))).toBe(
      'developer',
    );
  });

  it('denies by default: returns null when no credentials are present', () => {
    expect(resolveCallerRole(makeRequest('GET'))).toBeNull();
  });

  it('returns null for an unrecognized role', () => {
    expect(
      resolveCallerRole(
        makeRequest('GET', {
          authorization: 'Bearer test-token',
          'x-role': 'not-a-real-role',
        }),
      ),
    ).toBeNull();
  });
});

describe('team [id] route', () => {
  describe('authorization', () => {
    it('GET returns 401 unauthorized without credentials', async () => {
      const res = await GET(makeRequest('GET'), params);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe('unauthorized');
    });

    it('PATCH returns 403 forbidden for a developer caller', async () => {
      const res = await PATCH(
        makeRequest('PATCH', DEVELOPER_HEADERS, MUTATION_BODY),
        params,
      );
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.error.code).toBe('forbidden');
    });

    it('DELETE returns 403 forbidden for a developer caller', async () => {
      const res = await DELETE(makeRequest('DELETE', DEVELOPER_HEADERS), params);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.error.code).toBe('forbidden');
    });
  });

  describe('not-found handling', () => {
    it('GET returns 404 not_found for an unknown member id', async () => {
      const res = await GET(makeRequest('GET', ADMIN_HEADERS), {
        params: { id: 'does-not-exist' },
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe('not_found');
    });
  });

  describe('success path', () => {
    it('GET returns the member for a valid admin request', async () => {
      const res = await GET(makeRequest('GET', ADMIN_HEADERS), params);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.member.id).toBe(MEMBER_ID);
    });
  });

  describe('correlation id', () => {
    it('is present on a success response', async () => {
      const res = await GET(makeRequest('GET', ADMIN_HEADERS), params);

      expect(res.status).toBe(200);
      expect(res.headers.get('x-correlation-id')).toBeTruthy();
    });

    it('is present on an error response', async () => {
      const res = await GET(makeRequest('GET'), params);

      expect(res.status).toBe(401);
      expect(res.headers.get('x-correlation-id')).toBeTruthy();
    });
  });
});
