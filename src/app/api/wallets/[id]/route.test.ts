import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the API client envelope parsing layer used by the wallet route.
// The route is expected to unwrap a stable envelope shape:
//   { data: <payload>, error: null, correlationId: <string> }
// and to fail closed on malformed envelopes, auth failures, and
// unexpected status codes.
const parseEnvelope = vi.fn();

vi.mock('@/lib/api-client', () => ({
  parseEnvelope: (...args: unknown[]) => parseEnvelope(...args),
}));

import { GET, POST } from './route';

const VALID_ID = 'wallet_123';

function makeRequest(
  method: 'GET' | 'POST',
  opts: {
    body?: unknown;
    headers?: Record<string, string>;
    rawBody?: string;
  } = {},
): NextRequest {
  const headers = new Headers(opts.headers ?? {});
  const init: RequestInit = { method, headers };
  if (opts.rawBody !== undefined) {
    init.body = opts.rawBody;
  } else if (opts.body !== undefined) {
    headers.set('content-type', 'application/json');
    init.body = JSON.stringify(opts.body);
  }
  return new NextRequest(`http://localhost/api/wallets/${VALID_ID}`, init);
}

function ctx(id: string = VALID_ID) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/wallets/[id] envelope parsing', () => {
  beforeEach(() => {
    parseEnvelope.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('unwraps a successful envelope and returns the payload', async () => {
    parseEnvelope.mockResolvedValue({
      data: { id: VALID_ID, balance: '100' },
      error: null,
      correlationId: 'corr-abc',
    });

    const res = await GET(makeRequest('GET'), ctx());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ id: VALID_ID, balance: '100' });
  });

  it('propagates the correlation id from the envelope', async () => {
    parseEnvelope.mockResolvedValue({
      data: { id: VALID_ID },
      error: null,
      correlationId: 'corr-xyz',
    });

    const res = await GET(makeRequest('GET'), ctx());

    expect(res.headers.get('x-correlation-id')).toBe('corr-xyz');
  });

  it('fails closed with a stable error code when the envelope carries an error', async () => {
    parseEnvelope.mockResolvedValue({
      data: null,
      error: { code: 'WALLET_NOT_FOUND', message: 'not found' },
      correlationId: 'corr-404',
    });

    const res = await GET(makeRequest('GET'), ctx());
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe('WALLET_NOT_FOUND');
    expect(json.error.correlationId).toBe('corr-404');
  });

  it('rejects a malformed envelope (missing data and error) without silent success', async () => {
    parseEnvelope.mockResolvedValue({ correlationId: 'corr-bad' });

    const res = await GET(makeRequest('GET'), ctx());
    const json = await res.json();

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(json.error).toBeDefined();
    expect(json.error.code).toBeDefined();
  });

  it('rejects an envelope with unexpected extra fields', async () => {
    parseEnvelope.mockResolvedValue({
      data: { id: VALID_ID },
      error: null,
      correlationId: 'corr-extra',
      unexpected: 'field',
    });

    const res = await GET(makeRequest('GET'), ctx());

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('fails closed when the upstream returns a non-JSON body', async () => {
    parseEnvelope.mockRejectedValue(new Error('Unexpected token < in JSON'));

    const res = await GET(makeRequest('GET'), ctx());
    const json = await res.json();

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(json.error.code).toBeDefined();
  });

  it('fails closed on an unexpected upstream status code', async () => {
    parseEnvelope.mockResolvedValue({
      data: null,
      error: { code: 'UPSTREAM_ERROR', message: 'bad gateway' },
      correlationId: 'corr-502',
      status: 502,
    });

    const res = await GET(makeRequest('GET'), ctx());

    expect(res.status).toBeGreaterThanOrEqual(500);
  });

  it('rejects oversized payloads before parsing', async () => {
    const huge = 'x'.repeat(2 * 1024 * 1024);
    const res = await GET(
      makeRequest('GET', { rawBody: huge, headers: { 'content-type': 'application/json' } }),
      ctx(),
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(parseEnvelope).not.toHaveBeenCalled();
  });
});

describe('POST /api/wallets/[id] envelope parsing auth negatives', () => {
  beforeEach(() => {
    parseEnvelope.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects a request with no credentials', async () => {
    const res = await POST(makeRequest('POST', { body: { action: 'transfer' } }), ctx());

    expect(res.status).toBe(401);
    expect(parseEnvelope).not.toHaveBeenCalled();
  });

  it('rejects an invalid bearer token', async () => {
    const res = await POST(
      makeRequest('POST', {
        body: { action: 'transfer' },
        headers: { authorization: 'Bearer not-a-real-token' },
      }),
      ctx(),
    );

    expect(res.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const res = await POST(
      makeRequest('POST', {
        body: { action: 'transfer' },
        headers: { authorization: 'Bearer expired.token.value' },
      }),
      ctx(),
    );

    expect(res.status).toBe(401);
  });

  it('rejects a caller with the wrong role', async () => {
    const res = await POST(
      makeRequest('POST', {
        body: { action: 'transfer' },
        headers: { authorization: 'Bearer viewer-role-token' },
      }),
      ctx(),
    );

    expect([401, 403]).toContain(res.status);
  });

  it('does not allow envelope manipulation to bypass authz', async () => {
    parseEnvelope.mockResolvedValue({
      data: { id: VALID_ID, role: 'admin' },
      error: null,
      correlationId: 'corr-spoof',
    });

    const res = await POST(
      makeRequest('POST', {
        body: { action: 'transfer', envelope: { role: 'admin' } },
        headers: { authorization: 'Bearer viewer-role-token' },
      }),
      ctx(),
    );

    expect([401, 403]).toContain(res.status);
  });

  it('rejects a non-JSON request body', async () => {
    const res = await POST(
      makeRequest('POST', {
        rawBody: 'not json at all',
        headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json' },
      }),
      ctx(),
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects a body missing required envelope fields', async () => {
    const res = await POST(
      makeRequest('POST', {
        body: {},
        headers: { authorization: 'Bearer valid-token' },
      }),
      ctx(),
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
