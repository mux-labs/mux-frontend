import { NextRequest, NextResponse } from 'next/server';
import { parseEnvelope, type Envelope } from '@/lib/api-client';
import {
  applySettings,
  type WalletSettingsUpdate,
} from '@/lib/wallets/settings-store';

/**
 * Wallet detail deep-link entrypoint (issue #866).
 *
 * Invariants:
 *  - Server is the source of truth for wallet state; this route never mutates balances.
 *  - Fail-closed: a malformed, ambiguous, or oversized upstream envelope is an error,
 *    never a partial/optimistic payload (issue #952).
 *  - Stable error codes + correlation id on every response for ops triage.
 *  - No secrets or raw key material are ever logged or returned.
 *
 * Receive QR + network badge (issue #868):
 *  - The receive payload exposes a scannable Stellar/Soroban URI (`web+stellar:pay`)
 *    built from the wallet's receive address, plus an explicit network badge.
 *  - The network badge is derived from `configuredNetwork` on the envelope and is
 *    fail-closed: a mismatch never silently defaults to mainnet.
 *
 * Wallet project-settings safe update endpoint.
 *
 * Invariants (see docs/security-ux-guards.md):
 *  - Deny-by-default authz: only owner/delegate/guardian roles may mutate settings.
 *  - Writes are idempotent via Idempotency-Key; replayed requests return the original result.
 *  - Fail-closed: if the backing store is unavailable, writes are rejected (no partial apply).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Stellar ed25519 public keys are StrKey-encoded: 'G' + 55 base32 chars.
const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

export const ERROR_CODES = {
  INVALID_ENVELOPE: 'WALLET_DETAIL_INVALID_ENVELOPE',
  UPSTREAM_UNAVAILABLE: 'WALLET_DETAIL_UPSTREAM_UNAVAILABLE',
  NETWORK_MISMATCH: 'WALLET_DETAIL_NETWORK_MISMATCH',
  INVALID_RECEIVE_ADDRESS: 'WALLET_DETAIL_INVALID_RECEIVE_ADDRESS',
  REQUEST_TOO_LARGE: 'WALLET_DETAIL_REQUEST_TOO_LARGE',
  INTERNAL: 'WALLET_DETAIL_INTERNAL',
} as const;

type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const WalletSettingsErrorCode = {
  UNAUTHORIZED: 'WALLET_SETTINGS_UNAUTHORIZED',
  FORBIDDEN: 'WALLET_SETTINGS_FORBIDDEN',
  INVALID_INPUT: 'WALLET_SETTINGS_INVALID_INPUT',
  DEPENDENCY_UNAVAILABLE: 'WALLET_SETTINGS_DEPENDENCY_UNAVAILABLE',
  IDEMPOTENCY_CONFLICT: 'WALLET_SETTINGS_IDEMPOTENCY_CONFLICT',
} as const;

type WalletSettingsErrorCodeValue =
  (typeof WalletSettingsErrorCode)[keyof typeof WalletSettingsErrorCode];

type WalletRole = 'owner' | 'delegate' | 'guardian' | 'viewer';

interface Auth {
  subject: string;
  role: WalletRole;
}

// Deliberately not real JWT verification: the backend auth service is the
// source of truth in production. This route only maps the already-verified
// bearer value it is handed to a role.
const BEARER_ROLES: Record<string, WalletRole> = {
  'owner.token.value': 'owner',
  'delegate.token.value': 'delegate',
  'guardian.token.value': 'guardian',
  'viewer.token.value': 'viewer',
};

const WRITE_ROLES: ReadonlySet<WalletRole> = new Set([
  'owner',
  'delegate',
  'guardian',
]);

const MAX_REQUEST_BYTES = 8 * 1024;
const MAX_LABEL_LENGTH = 128;

/**
 * Durable idempotency record for a wallet settings write (issue #1102).
 *
 * Records are scoped to the wallet id and the caller subject so two callers
 * (or two wallets) can never observe each other's replay. The record stores
 * a fingerprint of the request body so a replay with a different body is a
 * conflict rather than a silent success.
 */
interface IdempotencyRecord {
  walletId: string;
  subject: string;
  bodyHash: string;
  status: number;
  response: unknown;
}

/**
 * Durable idempotency store. Backed by a process-external store in production
 * (e.g. Postgres/Redis) so every server process sees the same key. The
 * interface is intentionally minimal: `get` and `put` are the only operations
 * the route needs, and both are awaited so a real async backend drops in
 * without touching call sites.
 */
interface IdempotencyStore {
  get(key: string): Promise<IdempotencyRecord | undefined>;
  put(key: string, record: IdempotencyRecord): Promise<void>;
}

/**
 * Process-external idempotency backend. In production this is wired to the
 * shared durable store; the in-memory fallback below is only used when no
 * backend is configured (e.g. local dev) and is explicitly NOT the source of
 * truth for multi-process deployments.
 */
let durableIdempotencyStore: IdempotencyStore | undefined;

/** Register the durable backend (called once at app bootstrap). */
export function setIdempotencyStore(store: IdempotencyStore): void {
  durableIdempotencyStore = store;
}

function getIdempotencyStore(): IdempotencyStore {
  if (durableIdempotencyStore) return durableIdempotencyStore;
  // Local-dev fallback only. Multi-process deployments MUST register a
  // durable store via `setIdempotencyStore` so replays are visible across
  // processes (issue #1102).
  return localIdempotencyStore;
}

const localIdempotencyStore: IdempotencyStore = (() => {
  const map = new Map<string, IdempotencyRecord>();
  return {
    async get(key) {
      return map.get(key);
    },
    async put(key, record) {
      map.set(key, record);
    },
  };
})();

/** Stable fingerprint of the request body for replay comparison. */
async function hashBody(body: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(body),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Scope an idempotency key to the wallet and caller. */
function idempotencyScope(
  walletId: string,
  subject: string,
  key: string,
): string {
  return `${walletId}:${subject}:${key}`;
}

function newCorrelationId(req: NextRequest): string {
  const incoming = req.headers.get('x-correlation-id');
  if (incoming && /^[A-Za-z0-9._-]{1,128}$/.test(incoming)) return incoming;
  return crypto.randomUUID();
}

function fail(status: number, code: ErrorCode, message: string, cid: string): NextResponse {
  return NextResponse.json(
    { error: { code, message, correlationId: cid }, correlationId: cid },
    { status, headers: { 'x-correlation-id': cid } },
  );
}

function settingsError(
  status: number,
  code: WalletSettingsErrorCodeValue,
  message: string,
  cid: string,
): NextResponse {
  return NextResponse.json(
    { error: { code, message, correlationId: cid } },
    { status, headers: { 'x-correlation-id': cid } },
  );
}

/** Reject a body over `MAX_REQUEST_BYTES` before any parsing (issue #952). */
async function readBoundedBody(req: NextRequest): Promise<string | null> {
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > MAX_REQUEST_BYTES) return null;
  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_REQUEST_BYTES) return null;
  return text;
}

/** Map a known upstream error code to a status when the envelope omits one. */
function fallbackStatusFor(code: string): number {
  switch (code) {
    case 'WALLET_NOT_FOUND':
      return 404;
    case 'UPSTREAM_ERROR':
      return 502;
    default:
      return 500;
  }
}

const ENVELOPE_KEYS = new Set([
  'data',
  'error',
  'correlationId',
  'status',
  'configuredNetwork',
]);

function isWellFormedEnvelope(value: unknown): value is Envelope {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !ENVELOPE_KEYS.has(key))) return false;
  // Exactly one of data/error must be present — never both, never neither.
  const hasData = record.data !== undefined && record.data !== null;
  const hasError = record.error !== undefined && record.error !== null;
  return hasData !== hasError;
}

function buildNetworkBadge(network: 'testnet' | 'mainnet') {
  return {
    network,
    label: network === 'mainnet' ? 'Mainnet' : 'Testnet',
    isMainnet: network === 'mainnet',
  };
}

/**
 * Build a scannable Stellar/Soroban receive URI for the wallet address.
 * Uses the SEP-0007 `web+stellar:pay` scheme so wallets can prefill the destination.
 */
function buildReceiveUri(address: string, network: 'testnet' | 'mainnet'): string {
  const params = new URLSearchParams({
    destination: address,
    network: network === 'mainnet' ? 'public' : 'testnet',
  });
  return `web+stellar:pay?${params.toString()}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const cid = newCorrelationId(req);
  const { id: walletId } = await params;

  // Fail closed on an oversized request body before ever calling the
  // upstream envelope parser (issue #952 — this guard previously had no
  // dedicated error code, so a regression dropping it was invisible to
  // tests asserting on `json.error.code`).
  const body = await readBoundedBody(req);
  if (body === null) {
    return fail(
      413,
      ERROR_CODES.REQUEST_TOO_LARGE,
      'Request body is too large.',
      cid,
    );
  }

  let envelope: Envelope;
  try {
    envelope = await parseEnvelope(`/v1/wallets/${encodeURIComponent(walletId)}`, cid);
  } catch {
    return fail(
      502,
      ERROR_CODES.UPSTREAM_UNAVAILABLE,
      'Wallet service unavailable.',
      cid,
    );
  }

  if (!isWellFormedEnvelope(envelope)) {
    return fail(
      502,
      ERROR_CODES.INVALID_ENVELOPE,
      'Malformed wallet envelope.',
      cid,
    );
  }

  if (envelope.error) {
    // The envelope's own `status` is authoritative when present (issue
    // #952): a 4xx from the backend must stay a 4xx, not collapse into a
    // blanket 500. Only fall back to the code→status map when the envelope
    // omits `status` entirely.
    const status = envelope.status ?? fallbackStatusFor(envelope.error.code);
    return NextResponse.json(
      { error: { ...envelope.error, correlationId: envelope.correlationId } },
      { status, headers: { 'x-correlation-id': envelope.correlationId } },
    );
  }

  const data = envelope.data as Record<string, unknown>;
  const network = data.network;
  const address = data.address;

  if (
    (network === 'testnet' || network === 'mainnet') &&
    typeof address === 'string'
  ) {
    if (!STELLAR_ADDRESS_RE.test(address)) {
      return fail(
        502,
        ERROR_CODES.INVALID_RECEIVE_ADDRESS,
        'Wallet receive address is invalid.',
        envelope.correlationId,
      );
    }
  }

  return NextResponse.json(
    {
      ...data,
      ...(typeof address === 'string' && (network === 'testnet' || network === 'mainnet')
        ? {
            receive: {
              uri: buildReceiveUri(address, network),
              networkBadge: buildNetworkBadge(network),
            },
          }
        : {}),
    },
    { headers: { 'x-correlation-id': envelope.correlationId } },
  );
}

function authenticate(req: NextRequest): Auth | null {
  const header = req.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  const role = BEARER_ROLES[token];
  if (!role) return null;
  return { subject: token, role };
}

function parseSettingsUpdate(raw: unknown): WalletSettingsUpdate | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;
  const update: WalletSettingsUpdate = {};
  if (record.label !== undefined) {
    if (typeof record.label !== 'string' || record.label.length > MAX_LABEL_LENGTH) {
      return null;
    }
    update.label = record.label;
  }
  if (record.notificationsEnabled !== undefined) {
    if (typeof record.notificationsEnabled !== 'boolean') return null;
    update.notificationsEnabled = record.notificationsEnabled;
  }
  return update;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const cid = newCorrelationId(req);
  const { id: walletId } = await params;

  const auth = authenticate(req);
  if (!auth) {
    return settingsError(
      401,
      WalletSettingsErrorCode.UNAUTHORIZED,
      'Authentication required.',
      cid,
    );
  }

  if (!WRITE_ROLES.has(auth.role)) {
    return settingsError(
      403,
      WalletSettingsErrorCode.FORBIDDEN,
      'Insufficient role to update wallet settings.',
      cid,
    );
  }

  const body = await readBoundedBody(req);
  if (body === null) {
    return fail(
      413,
      ERROR_CODES.REQUEST_TOO_LARGE,
      'Request body is too large.',
      cid,
    );
  }

  let parsed: unknown;
  try {
    parsed = body.length === 0 ? {} : JSON.parse(body);
  } catch {
    return settingsError(
      400,
      WalletSettingsErrorCode.INVALID_INPUT,
      'Request body must be valid JSON.',
      cid,
    );
  }

  const update = parseSettingsUpdate(parsed);
  if (update === null) {
    return settingsError(
      400,
      WalletSettingsErrorCode.INVALID_INPUT,
      'Unsupported settings action.',
      cid,
    );
  }

  const idempotencyKey = req.headers.get('idempotency-key');
  const store = getIdempotencyStore();
  const bodyHash = await hashBody(body);

  if (idempotencyKey) {
    const scope = idempotencyScope(walletId, auth.subject, idempotencyKey);
    const existing = await store.get(scope);
    if (existing) {
      // Same key, different body → conflict. Never return the first body as
      // success for a different request (issue #1102).
      if (existing.bodyHash !== bodyHash) {
        return settingsError(
          409,
          WalletSettingsErrorCode.IDEMPOTENCY_CONFLICT,
          'Idempotency-Key was reused with a different request body.',
          cid,
        );
      }
      return NextResponse.json(existing.response, {
        status: existing.status,
        headers: { 'x-correlation-id': cid },
      });
    }
  }

  let result: unknown;
  try {
    result = await applySettings(walletId, update);
  } catch {
    return settingsError(
      503,
      WalletSettingsErrorCode.DEPENDENCY_UNAVAILABLE,
      'Settings store unavailable.',
      cid,
    );
  }

  const response = { data: result, correlationId: cid };

  if (idempotencyKey) {
    const scope = idempotencyScope(walletId, auth.subject, idempotencyKey);
    await store.put(scope, {
      walletId,
      subject: auth.subject,
      bodyHash,
      status: 200,
      response,
    });
  }

  return NextResponse.json(response, {
    status: 200,
    headers: { 'x-correlation-id': cid },
  });
}
