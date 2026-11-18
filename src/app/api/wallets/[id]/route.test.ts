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

// Mock the wallet settings backing store so we can assert idempotency
// replay and fail-closed behavior without touching a real store.
const applySettings = vi.fn();

vi.mock('@/lib/wallets/settings-store', () => ({
  applySettings: (...args: unknown[]) => applySettings(...args),
}));

// Mock the durable idempotency store so we can assert that replays are
// scoped to the wallet + caller and that a different body with the same
// key is a conflict rather than a silent success.
const getIdempotencyRecord = vi.fn();
const putIdempotencyRecord = vi.fn();

vi.mock('@/lib/idempotency/store', () => ({
  getIdempotencyRecord: (...args: unknown[]) => getIdempotencyRecord(...args),
  putIdempotencyRecord: (...args: unknown[]) => putIdempotencyRecord(...args),
}));

import { GET, POST, ERROR_CODES, WalletSettingsErrorCode } from './route';

const VALID_ID = 'wallet_123';

// A syntactically valid Stellar account address (G + 55 base32 chars).
const VALID_STELLAR_ADDRESS = 'G' + 'A'.repeat(55);

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

  it('rejects oversized payloads with a defined error code, not just a status', async () => {
    const huge = 'x'.repeat(2 * 1024 * 1024);
    const res = await GET(
      makeRequest('GET', { rawBody: huge, headers: { 'content-type': 'application/json' } }),
      ctx(),
    );
    const json = await res.json();

    expect(json.error.code).toBeDefined();
    expect(parseEnvelope).not.toHaveBeenCalled();
  });

  it('preserves an explicit 4xx envelope status instead of collapsing it to 500', async () => {
    parseEnvelope.mockResolvedValue({
      data: null,
      error: { code: 'WALLET_LOCKED', message: 'wallet is locked' },
      correlationId: 'corr-404-explicit',
      status: 404,
    });

    const res = await GET(makeRequest('GET'), ctx());
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe('WALLET_LOCKED');
  });

  it('rejects an envelope with both data and error explicitly null', async () => {
    parseEnvelope.mockResolvedValue({
      data: null,
      error: null,
      correlationId: 'corr-both-null',
    });

    const res = await GET(makeRequest('GET'), ctx());
    const json = await res.json();

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(json.error).toBeDefined();
    expect(json.error.code).toBeDefined();
  });
});

describe('POST /api/wallets/[id] envelope parsing', () => {
  beforeEach(() => {
    parseEnvelope.mockReset();
    applySettings.mockReset();
    getIdempotencyRecord.mockReset();
    putIdempotencyRecord.mockReset();
    getIdempotencyRecord.mockResolvedValue(null);
    putIdempotencyRecord.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('unwraps a successful envelope and returns the payload', async () => {
    parseEnvelope.mockResolvedValue({
      data: { id: VALID_ID, settings: { label: 'savings' } },
      error: null,
      correlationId: 'corr-post-ok',
    });

    const res = await POST(
      makeRequest('POST', { body: { settings: { label: 'savings' } } }),
      ctx(),
    );
    const json = await res.json();

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(json).toEqual({ id: VALID_ID, settings: { label: 'savings' } });
  });

  it('echoes the correlation id from the envelope on the response', async () => {
    parseEnvelope.mockResolvedValue({
      data: { id: VALID_ID },
      error: null,
      correlationId: 'corr-post-xyz',
    });

    const res = await POST(
      makeRequest('POST', { body: { settings: { label: 'savings' } } }),
      ctx(),
    );

    expect(res.headers.get('x-correlation-id')).toBe('corr-post-xyz');
  });

  it('maps an error envelope to a >=400 status with a stable error code', async () => {
    parseEnvelope.mockResolvedValue({
      data: null,
      error: { code: 'WALLET_NOT_FOUND', message: 'not found' },
      correlationId: 'corr-post-404',
    });

    const res = await POST(
      makeRequest('POST', { body: { settings: { label: 'savings' } } }),
      ctx(),
    );
    const json = await res.json();

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(json.error.code).toBe('WALLET_NOT_FOUND');
  });

  it('replays the stored response for the same key and same body', async () => {
    const body = { settings: { label: 'savings' } };
    getIdempotencyRecord.mockResolvedValue({
      walletId: VALID_ID,
      callerId: 'caller-1',
      requestHash: JSON.stringify(body),
      response: { status: 200, body: { id: VALID_ID, settings: { label: 'savings' } } },
    });

    const res = await POST(
      makeRequest('POST', {
        body,
        headers: { 'idempotency-key': 'key-1', 'x-caller-id': 'caller-1' },
      }),
      ctx(),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ id: VALID_ID, settings: { label: 'savings' } });
    expect(applySettings).not.toHaveBeenCalled();
  });

  it('returns a conflict when the same key is replayed with a different body', async () => {
    getIdempotencyRecord.mockResolvedValue({
      walletId: VALID_ID,
      callerId: 'caller-1',
      requestHash: JSON.stringify({ settings: { label: 'savings' } }),
      response: { status: 200, body: { id: VALID_ID, settings: { label: 'savings' } } },
    });

    const res = await POST(
      makeRequest('POST', {
        body: { settings: { label: 'checking' } },
        headers: { 'idempotency-key': 'key-1', 'x-caller-id': 'caller-1' },
      }),
      ctx(),
    );
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.code).toBe(ERROR_CODES.IDEMPOTENCY_CONFLICT);
    expect(applySettings).not.toHaveBeenCalled();
  });

  it('scopes idempotency records to the wallet and caller', async () => {
    parseEnvelope.mockResolvedValue({
      data: { id: VALID_ID, settings: { label: 'savings' } },
      error: null,
      correlationId: 'corr-scope',
    });

    await POST(
      makeRequest('POST', {
        body: { settings: { label: 'savings' } },
        headers: { 'idempotency-key': 'key-1', 'x-caller-id': 'caller-1' },
      }),
      ctx(),
    );

    expect(getIdempotencyRecord).toHaveBeenCalledWith(
      expect.objectContaining({ walletId: VALID_ID, callerId: 'caller-1', key: 'key-1' }),
    );
    expect(putIdempotencyRecord).toHaveBeenCalledWith(
      expect.objectContaining({ walletId: VALID_ID, callerId: 'caller-1', key: 'key-1' }),
    );
  });

  it('keeps the unsupported-action 400', async () => {
    const res = await POST(
      makeRequest('POST', {
        body: { action: 'unsupported' },
        headers: { 'idempotency-key': 'key-1', 'x-caller-id': 'caller-1' },
      }),
      ctx(),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe(ERROR_CODES.UNSUPPORTED_ACTION);
  });
});
