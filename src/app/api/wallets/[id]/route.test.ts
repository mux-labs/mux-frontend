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
});

describe('GET /api/wallets/[id] receive payload', () => {
  beforeEach(() => {
    parseEnvelope.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a web+stellar:pay URI and a badge matching the wallet network', async () => {
    parseEnvelope.mockResolvedValue({
      data: { id: VALID_ID, network: 'testnet', address: VALID_STELLAR_ADDRESS },
      error: null,
      correlationId: 'corr-recv',
    });

    const res = await GET(makeRequest('GET'), ctx());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.uri.startsWith('web+stellar:pay')).toBe(true);
    expect(json.network.network).toBe('testnet');
    expect(json.network.isMainnet).toBe(false);
  });

  it('marks a mainnet wallet badge as mainnet', async () => {
    parseEnvelope.mockResolvedValue({
      data: { id: VALID_ID, network: 'mainnet', address: VALID_STELLAR_ADDRESS },
      error: null,
      correlationId: 'corr-recv-main',
    });

    const res = await GET(makeRequest('GET'), ctx());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.network.network).toBe('mainnet');
    expect(json.network.isMainnet).toBe(true);
  });

  it('rejects an address that fails STELLAR_ADDRESS_RE', async () => {
    parseEnvelope.mockResolvedValue({
      data: { id: VALID_ID, network: 'testnet', address: 'not-a-stellar-address' },
      error: null,
      correlationId: 'corr-recv-bad',
    });

    const res = await GET(makeRequest('GET'), ctx());
    const json = await res.json();

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(json.error.code).toBe(ERROR_CODES.INVALID_RECEIVE_ADDRESS);
  });

  it('fails closed on a network mismatch instead of defaulting to mainnet', async () => {
    parseEnvelope.mockResolvedValue({
      data: { id: VALID_ID, network: 'testnet', address: VALID_STELLAR_ADDRESS },
      error: null,
      correlationId: 'corr-recv-mismatch',
      configuredNetwork: 'mainnet',
    });

    const res = await GET(makeRequest('GET'), ctx());
    const json = await res.json();

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(json.error.code).toBe(ERROR_CODES.NETWORK_MISMATCH);
    expect(json.network).toBeUndefined();
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
        headers: { authorization: 'Bearer viewer.token.value' },
      }),
      ctx(),
    );

    expect(res.status).toBe(403);
  });
});

describe('POST /api/wallets/[id] settings idempotency and fail-closed', () => {
  const OWNER_AUTH = { authorization: 'Bearer owner.token.value' };
  const DELEGATE_AUTH = { authorization: 'Bearer delegate.token.value' };
  const GUARDIAN_AUTH = { authorization: 'Bearer guardian.token.value' };
  const VIEWER_AUTH = { authorization: 'Bearer viewer.token.value' };

  function settingsRequest(
    body: Record<string, unknown>,
    headers: Record<string, string>,
  ): NextRequest {
    return makeRequest('POST', {
      body: { action: 'update-settings', settings: body },
      headers,
    });
  }

  beforeEach(() => {
    parseEnvelope.mockReset();
    applySettings.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('replays the original result for the same Idempotency-Key and calls the store once', async () => {
    const original = {
      id: VALID_ID,
      label: 'Primary',
      allowDirectSpend: true,
      guardianPublicKey: VALID_STELLAR_ADDRESS,
    };
    applySettings.mockResolvedValue(original);

    const headers = { ...OWNER_AUTH, 'idempotency-key': 'idem-replay-1' };
    const body = { label: 'Primary', allowDirectSpend: true };

    const first = await POST(settingsRequest(body, headers), ctx());
    const firstJson = await first.json();

    const second = await POST(settingsRequest(body, headers), ctx());
    const secondJson = await second.json();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(secondJson).toEqual(firstJson);
    expect(applySettings).toHaveBeenCalledTimes(1);
  });

  it('returns DEPENDENCY_UNAVAILABLE and persists nothing when the store rejects', async () => {
    applySettings.mockRejectedValue(new Error('store unavailable'));

    const res = await POST(
      settingsRequest(
        { label: 'Primary', allowDirectSpend: false },
        { ...OWNER_AUTH, 'idempotency-key': 'idem-fail-1' },
      ),
      ctx(),
    );
    const json = await res.json();

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(json.error.code).toBe(WalletSettingsErrorCode.DEPENDENCY_UNAVAILABLE);
    expect(applySettings).toHaveBeenCalledTimes(1);
    expect(json.settings).toBeUndefined();
  });

  it('forbids a caller without owner/delegate/guardian role', async () => {
    const res = await POST(
      settingsRequest(
        { label: 'Primary' },
        { ...VIEWER_AUTH, 'idempotency-key': 'idem-forbidden-1' },
      ),
      ctx(),
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe(WalletSettingsErrorCode.FORBIDDEN);
    expect(applySettings).not.toHaveBeenCalled();
  });

  it('allows a delegate and a guardian to update settings', async () => {
    applySettings.mockResolvedValue({ id: VALID_ID, label: 'Delegated' });

    const delegateRes = await POST(
      settingsRequest({ label: 'Delegated' }, { ...DELEGATE_AUTH, 'idempotency-key': 'idem-delegate-1' }),
      ctx(),
    );
    expect(delegateRes.status).toBe(200);

    applySettings.mockResolvedValue({ id: VALID_ID, label: 'Guarded' });
    const guardianRes = await POST(
      settingsRequest({ label: 'Guarded' }, { ...GUARDIAN_AUTH, 'idempotency-key': 'idem-guardian-1' }),
      ctx(),
    );
    expect(guardianRes.status).toBe(200);
  });

  it('rejects an invalid guardianPublicKey with INVALID_INPUT', async () => {
    const res = await POST(
      settingsRequest(
        { guardianPublicKey: 'not-a-stellar-address' },
        { ...OWNER_AUTH, 'idempotency-key': 'idem-invalid-1' },
      ),
      ctx(),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe(WalletSettingsErrorCode.INVALID_INPUT);
    expect(applySettings).not.toHaveBeenCalled();
  });
});
