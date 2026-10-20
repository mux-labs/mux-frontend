// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

// The route still imports its key list from @/mock-data/api-keys, which is no
// longer in the tree. Provide a hermetic fixture so the route can load and the
// tests do not depend on the shape of any shared mock set.
vi.mock('@/mock-data/api-keys', () => ({
  mockApiKeys: [
    { id: 'key_1', name: 'ci' },
    { id: 'key_2', name: 'deploy' },
  ],
}));

import { GET, POST } from './route';
import { isAuthorized, redact } from './guards';

const AUTH_HEADERS = { authorization: 'Bearer test-token' };

// Mirrors the route's bounds; asserted against observable behaviour below.
const DEFAULT_AUDIT_LIMIT = 50;
const MAX_AUDIT_LIMIT = 100;
const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 90;
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

function getRequest(
  params: Record<string, string>,
  headers: Record<string, string> = AUTH_HEADERS,
) {
  const url = new URL('http://localhost/api/api-keys');
  url.search = new URLSearchParams(params).toString();
  return new NextRequest(url, { method: 'GET', headers });
}

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/api-keys', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...AUTH_HEADERS, ...headers },
    body: JSON.stringify(body),
  });
}

// The idempotency cache is module-scoped, so every test needs keys that no
// other test has used. Pads a unique prefix out to an exact length.
let keyCounter = 0;
function idempotencyKey(length: number) {
  keyCounter += 1;
  return `idem-${keyCounter}-`.padEnd(length, 'k');
}

const ROTATE = { action: 'rotate', id: 'key_1', confirm: true };

describe('api-keys route', () => {
  describe('authorization', () => {
    it('GET returns 401 without credentials (deny-by-default)', async () => {
      const res = await GET(getRequest({}, {}));
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe('API_KEY_UNAUTHORIZED');
    });

    it('POST returns 401 without credentials before reading the body', async () => {
      const req = new NextRequest('http://localhost/api/api-keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(ROTATE),
      });
      const json = vi.spyOn(req, 'json');

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe('API_KEY_UNAUTHORIZED');
      expect(json).not.toHaveBeenCalled();
    });
  });

  describe('GET audit filters', () => {
    async function audit(params: Record<string, string>) {
      return GET(getRequest({ audit: 'true', ...params }));
    }

    it(`applies the default limit of ${DEFAULT_AUDIT_LIMIT} when limit is omitted`, async () => {
      const res = await audit({});
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.audit).toHaveLength(2);
      for (const key of body.audit) {
        expect(key.entries).toHaveLength(DEFAULT_AUDIT_LIMIT);
      }
    });

    it.each([1, MAX_AUDIT_LIMIT])('accepts limit=%i', async (limit) => {
      const res = await audit({ limit: String(limit) });
      const body = await res.json();

      expect(res.status).toBe(200);
      for (const key of body.audit) {
        expect(key.entries).toHaveLength(limit);
      }
    });

    it.each(['0', String(MAX_AUDIT_LIMIT + 1), '50.5', '-1', 'abc', ''])(
      'rejects limit=%j with API_KEY_INVALID_FILTER',
      async (limit) => {
        const res = await audit({ limit });
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error.code).toBe('API_KEY_INVALID_FILTER');
        expect(body.audit).toBeUndefined();
      },
    );

    it('accepts allow-listed action and outcome filters', async () => {
      const res = await audit({
        action: 'rotate',
        outcome: 'success',
        limit: String(MAX_AUDIT_LIMIT),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      const entries = body.audit.flatMap((key: { entries: unknown[] }) => key.entries);
      expect(entries.length).toBeGreaterThan(0);
      for (const key of body.audit) {
        for (const entry of key.entries) {
          expect(entry.action).toBe('rotate');
          expect(entry.outcome).toBe('success');
        }
      }
    });

    it.each(['delete', 'Create', ''])(
      'rejects unknown action=%j with API_KEY_INVALID_FILTER',
      async (action) => {
        const res = await audit({ action });
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error.code).toBe('API_KEY_INVALID_FILTER');
      },
    );

    it.each(['pending', 'SUCCESS', ''])(
      'rejects unknown outcome=%j with API_KEY_INVALID_FILTER',
      async (outcome) => {
        const res = await audit({ outcome });
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error.code).toBe('API_KEY_INVALID_FILTER');
      },
    );

    it('does not return audit data unless ?audit=true is set', async () => {
      const res = await GET(getRequest({ limit: String(MAX_AUDIT_LIMIT + 1) }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.audit).toBeUndefined();
    });
  });

  describe('GET range parsing', () => {
    it(`applies the default range of ${DEFAULT_RANGE_DAYS} days when days is omitted`, async () => {
      const res = await GET(getRequest({}));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.series).toHaveLength(2);
      for (const key of body.series) {
        expect(key.points).toHaveLength(DEFAULT_RANGE_DAYS);
      }
    });

    it.each([1, MAX_RANGE_DAYS])('accepts days=%i', async (days) => {
      const res = await GET(getRequest({ days: String(days) }));
      const body = await res.json();

      expect(res.status).toBe(200);
      for (const key of body.series) {
        expect(key.points).toHaveLength(days);
      }
    });

    it.each(['0', String(MAX_RANGE_DAYS + 1), '1.5', 'abc', '-1', ''])(
      'rejects days=%j with API_KEY_INVALID_RANGE',
      async (days) => {
        const res = await GET(getRequest({ days }));
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error.code).toBe('API_KEY_INVALID_RANGE');
        expect(body.series).toBeUndefined();
      },
    );
  });

  describe('POST idempotency', () => {
    // Runs the same request twice and reports whether each one reached the
    // write path (which is the only place the request body is parsed).
    async function postTwice(body: unknown, headers: Record<string, string>) {
      const firstReq = postRequest(body, headers);
      const secondReq = postRequest(body, headers);
      const firstJson = vi.spyOn(firstReq, 'json');
      const secondJson = vi.spyOn(secondReq, 'json');

      const firstRes = await POST(firstReq);
      const secondRes = await POST(secondReq);

      return {
        first: { status: firstRes.status, body: await firstRes.json() },
        second: { status: secondRes.status, body: await secondRes.json() },
        writes: firstJson.mock.calls.length + secondJson.mock.calls.length,
      };
    }

    it('treats a missing idempotency-key header as no key (every request executes)', async () => {
      const { first, second, writes } = await postTwice(ROTATE, {});

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(writes).toBe(2);
      expect(second.body.correlationId).not.toBe(first.body.correlationId);
    });

    it('treats a whitespace-only idempotency-key the same as a missing header', async () => {
      const { first, second, writes } = await postTwice(ROTATE, {
        'idempotency-key': '   ',
      });

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(writes).toBe(2);
      expect(second.body.correlationId).not.toBe(first.body.correlationId);
    });

    it(`accepts a ${MAX_IDEMPOTENCY_KEY_LENGTH}-character key and replays the cached response`, async () => {
      const key = idempotencyKey(MAX_IDEMPOTENCY_KEY_LENGTH);
      expect(key).toHaveLength(MAX_IDEMPOTENCY_KEY_LENGTH);

      const { first, second, writes } = await postTwice(ROTATE, {
        'idempotency-key': key,
      });

      expect(first.status).toBe(200);
      expect(second).toEqual(first);
      expect(writes).toBe(1);
    });

    it(`rejects a ${MAX_IDEMPOTENCY_KEY_LENGTH + 1}-character key so it is never cached or replayed`, async () => {
      const key = idempotencyKey(MAX_IDEMPOTENCY_KEY_LENGTH + 1);
      expect(key).toHaveLength(MAX_IDEMPOTENCY_KEY_LENGTH + 1);

      const { first, second, writes } = await postTwice(ROTATE, {
        'idempotency-key': key,
      });

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(writes).toBe(2);
      expect(second.body.correlationId).not.toBe(first.body.correlationId);
    });

    it('replays the cached response for the same key and body without re-running the write', async () => {
      const headers = { 'idempotency-key': idempotencyKey(16) };
      const { first, second, writes } = await postTwice(ROTATE, headers);

      expect(first.status).toBe(200);
      expect(first.body).toMatchObject({ action: 'rotate', id: 'key_1' });
      expect(second.status).toBe(first.status);
      expect(second.body).toEqual(first.body);
      expect(writes).toBe(1);
    });

    it('does not cache a failed write, so the key can be retried with a valid body', async () => {
      const headers = { 'idempotency-key': idempotencyKey(16) };

      const failed = await POST(postRequest({ action: 'rotate', id: 'key_1' }, headers));
      const failedBody = await failed.json();
      const retried = await POST(postRequest(ROTATE, headers));
      const retriedBody = await retried.json();

      expect(failed.status).toBe(400);
      expect(failedBody.error.code).toBe('API_KEY_CONFIRMATION_REQUIRED');
      expect(retried.status).toBe(200);
      expect(retriedBody).toMatchObject({ action: 'rotate', id: 'key_1' });
    });
  });
});

describe('redact', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an empty string', ''],
    ['a number', 12345],
    ['a boolean', true],
    ['an object', { key: 'supersecret' }],
    ['an array', ['supersecret']],
  ])('returns "[redacted]" for %s', (_label, value) => {
    expect(redact(value)).toBe('[redacted]');
  });

  it('returns only the length for a non-empty string', () => {
    const out = redact('supersecret');

    expect(out).toBe('[redacted:11]');
    expect(out).not.toContain('supersecret');
  });

  it('never echoes any part of the original secret', () => {
    const secret = 'sk_live_51M0L9SA9mG8G8xX5u4v5';
    const out = redact(secret);

    expect(out).toBe(`[redacted:${secret.length}]`);
    expect(out).not.toContain(secret);
    expect(out).not.toContain('sk_');
    expect(out).not.toContain(secret.slice(-4));
  });
});

describe('isAuthorized', () => {
  function withAuth(authorization?: string) {
    return new Request('http://localhost/api/api-keys', {
      headers: authorization === undefined ? {} : { authorization },
    });
  }

  it('returns false when the authorization header is missing', () => {
    expect(isAuthorized(withAuth())).toBe(false);
  });

  it.each(['Bearer', 'ApiKey', 'Bearer ', 'Bearer  token'])(
    'returns false when the header has no token: %j',
    (header) => {
      expect(isAuthorized(withAuth(header))).toBe(false);
    },
  );

  it.each(['Basic dXNlcjpwYXNz', 'Token abc', 'Digest abc', 'test-token'])(
    'returns false for an unknown scheme: %j',
    (header) => {
      expect(isAuthorized(withAuth(header))).toBe(false);
    },
  );

  // Scheme matching is case-sensitive today; changing that must be a
  // deliberate test update.
  it.each(['bearer test-token', 'BEARER test-token', 'apikey test-key', 'Apikey test-key'])(
    'returns false for a non-canonical scheme casing: %j',
    (header) => {
      expect(isAuthorized(withAuth(header))).toBe(false);
    },
  );

  it.each(['Bearer test-token', 'ApiKey test-key'])(
    'returns true for %j',
    (header) => {
      expect(isAuthorized(withAuth(header))).toBe(true);
    },
  );
});
