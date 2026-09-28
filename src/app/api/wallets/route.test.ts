import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { OnboardingErrorCode, POST } from './route';

const AUTH_HEADERS = {
  authorization: 'Bearer test-token',
  'x-subject': 'user_owner',
  'x-role': 'owner',
  'x-owner-scopes': 'user_owner',
  'idempotency-key': 'idem-1',
};

function walletRequest(
  body: unknown = {},
  headers: Record<string, string> = AUTH_HEADERS,
) {
  return new NextRequest('http://localhost/api/wallets', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function without(key: string) {
  const rest: Record<string, string> = { ...AUTH_HEADERS };
  delete rest[key];
  return rest;
}

async function errorCode(res: Response) {
  const json = await res.json();
  return json.error.code as string;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/wallets auth checks', () => {
  it('returns 401 without any credential', async () => {
    const res = await POST(
      walletRequest({}, { 'x-subject': 'user_owner', 'x-role': 'owner' }),
    );
    expect(res.status).toBe(401);
    expect(await errorCode(res)).toBe(OnboardingErrorCode.UNAUTHORIZED);
  });

  it('returns 401 when subject or role cannot be resolved', async () => {
    expect((await POST(walletRequest({}, without('x-subject')))).status).toBe(401);
    expect((await POST(walletRequest({}, without('x-role')))).status).toBe(401);
  });

  it('returns 401 for an unknown role', async () => {
    const res = await POST(walletRequest({}, { ...AUTH_HEADERS, 'x-role': 'admin' }));
    expect(res.status).toBe(401);
  });

  it('accepts an API key in place of a bearer token', async () => {
    const res = await POST(
      walletRequest({}, { ...without('authorization'), 'x-api-key': 'key_123' }),
    );
    expect(res.status).not.toBe(401);
  });

  it('returns 403 when the caller is not scoped to the owner', async () => {
    const res = await POST(walletRequest({ owner: 'someone_else' }));
    expect(res.status).toBe(403);
    expect(await errorCode(res)).toBe(OnboardingErrorCode.FORBIDDEN);
  });

  it('returns 403 for a delegate with no owner scope', async () => {
    const res = await POST(
      walletRequest({}, { ...AUTH_HEADERS, 'x-role': 'delegate', 'x-owner-scopes': '' }),
    );
    expect(res.status).toBe(403);
  });

  it('requires an Idempotency-Key header', async () => {
    const res = await POST(walletRequest({}, without('idempotency-key')));
    expect(res.status).toBe(400);
    expect(await errorCode(res)).toBe(OnboardingErrorCode.INVALID_REQUEST);
  });

  it('echoes the caller correlation id on errors', async () => {
    const res = await POST(
      walletRequest({}, { 'x-correlation-id': 'corr-123' }),
    );
    expect(res.headers.get('x-correlation-id')).toBe('corr-123');
    expect((await res.json()).error.correlationId).toBe('corr-123');
  });

  it('fails closed with 503 when provisioning is unavailable', async () => {
    const res = await POST(walletRequest({}));
    expect(res.status).toBe(503);
    expect(await errorCode(res)).toBe(OnboardingErrorCode.UPSTREAM_UNAVAILABLE);
  });
});

describe('POST /api/wallets network param', () => {
  it('defaults to testnet when network is omitted', async () => {
    const res = await POST(walletRequest({}));
    expect(await errorCode(res)).not.toBe(OnboardingErrorCode.INVALID_NETWORK);
  });

  it('accepts testnet explicitly', async () => {
    const res = await POST(walletRequest({ network: 'testnet' }));
    expect(res.status).toBe(503);
  });

  it('rejects unknown networks with a stable error code', async () => {
    for (const network of ['futurenet', 'MAINNET', '']) {
      const res = await POST(walletRequest({ network }));
      expect(res.status).toBe(400);
      expect(await errorCode(res)).toBe(OnboardingErrorCode.INVALID_NETWORK);
    }
  });

  it('rejects a non-string network as malformed', async () => {
    const res = await POST(walletRequest({ network: 1 }));
    expect(res.status).toBe(400);
    expect(await errorCode(res)).toBe(OnboardingErrorCode.INVALID_REQUEST);
  });

  it('blocks mainnet unless MUX_MAINNET_ENABLED=true', async () => {
    vi.stubEnv('MUX_MAINNET_ENABLED', '');
    const res = await POST(walletRequest({ network: 'mainnet' }));
    expect(res.status).toBe(403);
    expect(await errorCode(res)).toBe(OnboardingErrorCode.NETWORK_DISABLED);
  });

  it('allows mainnet when the flag is enabled', async () => {
    vi.stubEnv('MUX_MAINNET_ENABLED', 'true');
    const res = await POST(walletRequest({ network: 'mainnet' }));
    expect(res.status).toBe(503);
  });

  it('checks auth before validating the network', async () => {
    const res = await POST(walletRequest({ network: 'bogus' }, {}));
    expect(res.status).toBe(401);
  });
});
