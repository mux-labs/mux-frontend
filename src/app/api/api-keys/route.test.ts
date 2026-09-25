import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the auth/session layer so we can exercise authz negatives without a real JWT.
const getSession = vi.fn();
vi.mock('@/lib/auth/session', () => ({
  getSession: (...args: unknown[]) => getSession(...args),
}));

// Mock the api-key store so tests are hermetic and can assert idempotency/fail-closed.
const listApiKeys = vi.fn();
const createApiKey = vi.fn();
const revokeApiKey = vi.fn();
vi.mock('@/lib/api-keys/store', () => ({
  listApiKeys: (...args: unknown[]) => listApiKeys(...args),
  createApiKey: (...args: unknown[]) => createApiKey(...args),
  revokeApiKey: (...args: unknown[]) => revokeApiKey(...args),
}));

import { GET, POST, DELETE } from './route';

const OWNER = { userId: 'user_owner', role: 'owner' } as const;
const DELEGATE = { userId: 'user_delegate', role: 'delegate' } as const;

function jsonRequest(method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/api-keys', {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('api-keys route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/api-keys', () => {
    it('returns 401 when there is no session (deny-by-default)', async () => {
      getSession.mockResolvedValue(null);

      const res = await GET(jsonRequest('GET'));

      expect(res.status).toBe(401);
      expect(listApiKeys).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller lacks the owner role', async () => {
      getSession.mockResolvedValue(DELEGATE);

      const res = await GET(jsonRequest('GET'));

      expect(res.status).toBe(403);
      expect(listApiKeys).not.toHaveBeenCalled();
    });

    it('lists keys for an authorized owner without leaking raw key material', async () => {
      getSession.mockResolvedValue(OWNER);
      listApiKeys.mockResolvedValue([
        { id: 'key_1', label: 'ci', prefix: 'mux_live_ab', createdAt: '2024-01-01T00:00:00.000Z' },
      ]);

      const res = await GET(jsonRequest('GET'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(listApiKeys).toHaveBeenCalledWith(OWNER.userId);
      expect(body.keys).toHaveLength(1);
      expect(JSON.stringify(body)).not.toMatch(/secret|private|jwt/i);
    });

    it('fails closed with 503 when the store is unavailable', async () => {
      getSession.mockResolvedValue(OWNER);
      listApiKeys.mockRejectedValue(new Error('db down'));

      const res = await GET(jsonRequest('GET'));

      expect(res.status).toBe(503);
    });
  });

  describe('POST /api/api-keys', () => {
    it('returns 401 without a session', async () => {
      getSession.mockResolvedValue(null);

      const res = await POST(jsonRequest('POST', { label: 'ci' }));

      expect(res.status).toBe(401);
      expect(createApiKey).not.toHaveBeenCalled();
    });

    it('returns 403 for a non-owner role', async () => {
      getSession.mockResolvedValue(DELEGATE);

      const res = await POST(jsonRequest('POST', { label: 'ci' }));

      expect(res.status).toBe(403);
      expect(createApiKey).not.toHaveBeenCalled();
    });

    it('rejects an oversized/invalid payload with 400', async () => {
      getSession.mockResolvedValue(OWNER);

      const res = await POST(jsonRequest('POST', { label: 'x'.repeat(5000) }));

      expect(res.status).toBe(400);
      expect(createApiKey).not.toHaveBeenCalled();
    });

    it('creates a key once and is idempotent on replayed idempotency keys', async () => {
      getSession.mockResolvedValue(OWNER);
      createApiKey.mockResolvedValue({
        id: 'key_1',
        label: 'ci',
        prefix: 'mux_live_ab',
        secret: 'mux_live_ab_secret',
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      const headers = { 'idempotency-key': 'idem-123' };
      const first = await POST(jsonRequest('POST', { label: 'ci' }, headers));
      const second = await POST(jsonRequest('POST', { label: 'ci' }, headers));

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(createApiKey).toHaveBeenCalledTimes(1);
    });

    it('fails closed with 503 when the store write fails', async () => {
      getSession.mockResolvedValue(OWNER);
      createApiKey.mockRejectedValue(new Error('db down'));

      const res = await POST(jsonRequest('POST', { label: 'ci' }));

      expect(res.status).toBe(503);
    });
  });

  describe('DELETE /api/api-keys', () => {
    it('returns 401 without a session', async () => {
      getSession.mockResolvedValue(null);

      const res = await DELETE(jsonRequest('DELETE', { id: 'key_1' }));

      expect(res.status).toBe(401);
      expect(revokeApiKey).not.toHaveBeenCalled();
    });

    it('returns 403 for a revoked/non-owner delegate', async () => {
      getSession.mockResolvedValue(DELEGATE);

      const res = await DELETE(jsonRequest('DELETE', { id: 'key_1' }));

      expect(res.status).toBe(403);
      expect(revokeApiKey).not.toHaveBeenCalled();
    });

    it('revokes a key for an authorized owner', async () => {
      getSession.mockResolvedValue(OWNER);
      revokeApiKey.mockResolvedValue(undefined);

      const res = await DELETE(jsonRequest('DELETE', { id: 'key_1' }));

      expect(res.status).toBe(200);
      expect(revokeApiKey).toHaveBeenCalledWith(OWNER.userId, 'key_1');
    });
  });
});
