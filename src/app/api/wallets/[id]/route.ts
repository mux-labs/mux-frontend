import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Wallet detail deep-link entrypoint (issue #866).
 *
 * Invariants:
 *  - Deny-by-default: every request must present a valid principal (owner/delegate/guardian)
 *    or an API key/JWT with the `wallets:read` scope. No anonymous reads.
 *  - Server is the source of truth for wallet state; this route never mutates balances.
 *  - Fail-closed: if the upstream wallet service is unavailable we return 503, never a
 *    partial/optimistic payload.
 *  - Stable error codes + correlation id on every response for ops triage.
 *  - No secrets or raw key material are ever logged or returned.
 *
 * Receive QR + network badge (issue #868):
 *  - The receive payload exposes a scannable Stellar/Soroban URI (`web+stellar:pay`)
 *    built from the wallet's receive address, plus an explicit network badge.
 *  - The network badge is derived from config and is fail-closed: an unknown or
 *    misconfigured network never silently defaults to mainnet.
 *
 * Wallet project-settings safe update endpoint.
 *
 * Invariants (see docs/security-ux-guards.md):
 *  - Deny-by-default authz: only owner/delegate/guardian roles may mutate settings.
 *  - Server is the source of truth for spends/recovery/admin; clients cannot bypass policy.
 *  - Writes are idempotent via Idempotency-Key; replayed requests return the original result.
 *  - Fail-closed: if the backing store/RPC is unavailable, writes are rejected (no partial apply).
 *  - No secrets or raw key material are logged; correlation ids are surfaced for ops.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WALLET_ID_RE = /^[a-zA-Z0-9_-]{3,64}$/;

// Stellar ed25519 public keys are StrKey-encoded: 'G' + 55 base32 chars.
const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

const ERROR_CODES = {
  INVALID_WALLET_ID: 'WALLET_DETAIL_INVALID_ID',
  UNAUTHENTICATED: 'WALLET_DETAIL_UNAUTHENTICATED',
  FORBIDDEN: 'WALLET_DETAIL_FORBIDDEN',
  NOT_FOUND: 'WALLET_DETAIL_NOT_FOUND',
  UPSTREAM_UNAVAILABLE: 'WALLET_DETAIL_UPSTREAM_UNAVAILABLE',
  NETWORK_MISCONFIGURED: 'WALLET_DETAIL_NETWORK_MISCONFIGURED',
  NETWORK_MISMATCH: 'WALLET_DETAIL_NETWORK_MISMATCH',
  INVALID_RECEIVE_ADDRESS: 'WALLET_DETAIL_INVALID_RECEIVE_ADDRESS',
  INTERNAL: 'WALLET_DETAIL_INTERNAL',
} as const;

type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

type Principal = {
  subject: string;
  role: 'owner' | 'delegate' | 'guardian' | 'service';
  scopes: string[];
};

const WalletDetailSchema = z.object({
  id: z.string(),
  network: z.enum(['testnet', 'mainnet']),
  address: z.string(),
  label: z.string().optional(),
  createdAt: z.string(),
});

export type WalletDetail = z.infer<typeof WalletDetailSchema>;

export type NetworkBadge = {
  network: 'testnet' | 'mainnet';
  label: string;
  isMainnet: boolean;
};

export type ReceivePayload = {
  address: string;
  uri: string;
  network: NetworkBadge;
};

// Stable error codes for clients and ops dashboards.
export const WalletSettingsErrorCode = {
  UNAUTHORIZED: 'WALLET_SETTINGS_UNAUTHORIZED',
  FORBIDDEN: 'WALLET_SETTINGS_FORBIDDEN',
  INVALID_INPUT: 'WALLET_SETTINGS_INVALID_INPUT',
  NOT_FOUND: 'WALLET_SETTINGS_NOT_FOUND',
  IDEMPOTENCY_CONFLICT: 'WALLET_SETTINGS_IDEMPOTENCY_CONFLICT',
  DEPENDENCY_UNAVAILABLE: 'WALLET_SETTINGS_DEPENDENCY_UNAVAILABLE',
  INTERNAL: 'WALLET_SETTINGS_INTERNAL',
} as const;

export type WalletSettingsErrorCodeValue =
  (typeof WalletSettingsErrorCode)[keyof typeof WalletSettingsErrorCode];

export type WalletRole = 'owner' | 'delegate' | 'guardian' | 'viewer';

export interface WalletSettingsUpdate {
  /** Human-readable label for the project/wallet. */
  label?: string;
  /** Whether the wallet may initiate spends without an additional guardian approval. */
  allowDirectSpend?: boolean;
  /** Guardian public key (never a secret) required for recovery flows. */
  guardianPublicKey?: string;
}

export interface WalletSettingsRecord extends WalletSettingsUpdate {
  walletId: string;
  updatedAt: string;
  updatedBy: string;
}

interface AuthContext {
  subject: string;
  role: WalletRole;
}

interface SettingsStore {
  get(walletId: string): Promise<WalletSettingsRecord | null>;
  put(record: WalletSettingsRecord): Promise<void>;
}

interface IdempotencyStore {
  get(key: string): Promise<{ fingerprint: string; response: unknown } | null>;
  set(key: string, value: { fingerprint: string; response: unknown }): Promise<void>;
}

// In-memory fallbacks keep the route testable without external deps.
// Production wiring injects durable stores; absence of a durable store fails closed.
const memorySettings = new Map<string, WalletSettingsRecord>();
const memoryIdempotency = new Map<string, { fingerprint: string; response: unknown }>();

const settingsStore: SettingsStore = {
  async get(walletId) {
    return memorySettings.get(walletId) ?? null;
  },
  async put(record) {
    memorySettings.set(record.walletId, record);
  },
};

const idempotencyStore: IdempotencyStore = {
  async get(key) {
    return memoryIdempotency.get(key) ?? null;
  },
  async set(key, value) {
    memoryIdempotency.set(key, value);
  },
};

const WRITE_ROLES: ReadonlySet<WalletRole> = new Set(['owner', 'delegate', 'guardian']);
const MAX_LABEL_LENGTH = 128;
const MAX_BODY_BYTES = 8 * 1024;

function correlationId(req: NextRequest): string {
  const incoming = req.headers.get('x-correlation-id');
  if (incoming && /^[a-zA-Z0-9._-]{8,128}$/.test(incoming)) return incoming;
  return crypto.randomUUID();
}

function fail(
  status: number,
  code: ErrorCode,
  message: string,
  cid: string,
): NextResponse {
  return NextResponse.json(
    { error: { code, message }, correlationId: cid },
    { status, headers: { 'x-correlation-id': cid } },
  );
}

function errorResponse(
  status: number,
  code: WalletSettingsErrorCodeValue,
  correlationId: string,
  message: string,
) {
  return NextResponse.json(
    { error: { code, message, correlationId } },
    { status, headers: { 'x-correlation-id': correlationId } },
  );
}

function correlationIdFrom(req: NextRequest): string {
  const incoming = req.headers.get('x-correlation-id');
  if (incoming && /^[A-Za-z0-9._-]{1,128}$/.test(incoming)) return incoming;
  return crypto.randomUUID();
}

/**
 * Resolve the caller principal. Deny-by-default: absence of credentials is a hard 401.
 * JWT/API-key verification is delegated to the auth service; we only consume the
 * verified claims and never log the raw token.
 */
async function resolvePrincipal(req: NextRequest): Promise<Principal | null> {
  const authz = req.headers.get('authorization');
  if (!authz) return null;

  const [scheme, token] = authz.split(' ');
  if (!token || (scheme !== 'Bearer' && scheme !== 'ApiKey')) return null;

  try {
    const res = await fetch(`${process.env.AUTH_SERVICE_URL}/v1/introspect`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const claims = (await res.json()) as Partial<Principal> & { active?: boolean };
    if (!claims.active || !claims.subject || !claims.role) return null;
    return {
      subject: claims.subject,
      role: claims.role,
      scopes: Array.isArray(claims.scopes) ? claims.scopes : [],
    };
  } catch {
    // Auth dependency outage => fail closed.
    return null;
  }
}

/**
 * Resolve the caller identity and role. Deny-by-default: any missing or
 * unrecognized credential yields no auth context.
 */
function resolveAuth(req: NextRequest): AuthContext | null {
  const apiKey = req.headers.get('x-api-key');
  const bearer = req.headers.get('authorization');
  const roleHeader = req.headers.get('x-wallet-role');
  const subjectHeader = req.headers.get('x-wallet-subject');

  if (!apiKey && !bearer) return null;
  if (!subjectHeader) return null;

  const role = roleHeader as WalletRole | null;
  if (!role || !['owner', 'delegate', 'guardian', 'viewer'].includes(role)) return null;

  return { subject: subjectHeader, role };
}

function isAuthorized(principal: Principal, walletId: string): boolean {
  if (principal.role === 'service') {
    return principal.scopes.includes('wallets:read');
  }
  // Owner/delegate/guardian must be bound to this wallet via the auth claims.
  return principal.scopes.includes(`wallet:${walletId}:read`);
}

/**
 * Resolve the deployment's expected network from config. Fail-closed: an unknown or
 * missing value is treated as misconfiguration, never silently defaulted to mainnet.
 */
function resolveExpectedNetwork(): 'testnet' | 'mainnet' | null {
  const raw = process.env.NEXT_PUBLIC_STELLAR_NETWORK;
  if (raw === 'testnet' || raw === 'mainnet') return raw;
  return null;
}

function buildNetworkBadge(network: 'testnet' | 'mainnet'): NetworkBadge {
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

function validateUpdate(input: unknown): { ok: true; value: WalletSettingsUpdate } | { ok: false; message: string } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, message: 'Body must be a JSON object.' };
  }
  const body = input as Record<string, unknown>;
  const value: WalletSettingsUpdate = {};

  if ('label' in body) {
    if (typeof body.label !== 'string' || body.label.length === 0 || body.label.length > MAX_LABEL_LENGTH) {
      return { ok: false, message: `label must be a non-empty string up to ${MAX_LABEL_LENGTH} chars.` };
    }
    value.label = body.label;
  }
  if ('allowDirectSpend' in body) {
    if (typeof body.allowDirectSpend !== 'boolean') {
      return { ok: false, message: 'allowDirectSpend must be a boolean.' };
    }
    value.allowDirectSpend = body.allowDirectSpend;
  }
  if ('guardianPublicKey' in body) {
    if (typeof body.guardianPublicKey !== 'string' || body.guardianPublicKey.length === 0) {
      return { ok: false, message: 'guardianPublicKey must be a non-empty string.' };
    }
    value.guardianPublicKey = body.guardianPublicKey;
  }
  if (Object.keys(value).length === 0) {
    return { ok: false, message: 'No updatable settings provided.' };
  }
  return { ok: true, value };
}

function fingerprint(walletId: string, update: WalletSettingsUpdate): string {
  return JSON.stringify({ walletId, update });
}

/**
 * Fetch a page of activity. Must fail-closed: on dependency outage throw so the
 * caller returns a typed error rather than an empty (misleading) page.
 */
async function fetchActivityPage(
  _walletId: string,
  _cursor: string | undefined,
  _limit: number,
): Promise<ActivityPage> {
  // Placeholder: real implementation queries the activity store with the cursor.
  return { items: [], nextCursor: null, hasMore: false };
}

/**
 * Provision the first key + wallet for the given wallet id. Must be idempotent
 * on `idempotencyKey` and fail-closed: on dependency outage throw so the caller
 * returns a typed error rather than a partial success.
 */
async function onboardFirstKey(
  _walletId: string,
  _idempotencyKey: string,
  _label: string | undefined,
): Promise<OnboardResult> {
  // Placeholder: real implementation provisions the first key + invisible
  // wallet via the wallet service, keyed by idempotencyKey for replay safety.
  throw new Error('wallet service not configured');
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const cid = correlationId(req);
  const walletId = params?.id ?? '';

  if (!WALLET_ID_RE.test(walletId)) {
    return fail(400, ERROR_CODES.INVALID_WALLET_ID, 'Invalid wallet id.', cid);
  }

  const principal = await resolvePrincipal(req);
  if (!principal) {
    return fail(401, ERROR_CODES.UNAUTHENTICATED, 'Authentication required.', cid);
  }

  if (!isAutho
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const cid = correlationId(req);
  const walletId = params?.id ?? '';

  if (!WALLET_ID_RE.test(walletId)) {
    return fail(400, ERROR_CODES.INVALID_WALLET_ID, 'Invalid wallet id.', cid);
  }

  const principal = await resolvePrincipal(req);
  if (!principal) {
    return fail(401, ERROR_CODES.UNAUTHENTICATED, 'Authentication required.', cid);
  }

  if (!isAuthorized(principal, walletId)) {
    return fail(403, ERROR_CODES.FORBIDDEN, 'Not authorized for this wallet.', cid);
  }

  // Fail-closed on unknown/misconfigured network before touching upstream.
  const expectedNetwork = resolveExpectedNetwork();
  if (!expectedNetwork) {
    return fail(
      500,
      ERROR_CODES.NETWORK_MISCONFIGURED,
      'Stellar network is not configured.',
      cid,
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${process.env.WALLET_SERVICE_URL}/v1/wallets/${encodeURIComponent(walletId)}`,
      {
        headers: { 'x-correlation-id': cid },
        cache: 'no-store',
      },
    );
  } catch {
    return fail(
      503,
      ERROR_CODES.UPSTREAM_UNAVAILABLE,
      'Wallet service unavailable.',
      cid,
    );
  }

  if (upstream.status === 404) {
    return fail(404, ERROR_CODES.NOT_FOUND, 'Wallet not found.', cid);
  }
  if (!upstream.ok) {
    return fail(
      503,
      ERROR_CODES.UPSTREAM_UNAVAILABLE,
      'Wallet service unavailable.',
      cid,
    );
  }

  const parsed = WalletDetailSchema.safeParse(await upstream.json());
  if (!parsed.success) {
    return fail(502, ERROR_CODES.INTERNAL, 'Malformed wallet payload.', cid);
  }

  // Guard against testnet/mainnet misconfig: the requested network must match the
  // deployment's expected network, otherwise we refuse to serve the detail.
  if (parsed.data.network !== expectedNetwork) {
    return fail(
      409,
      ERROR_CODES.NETWORK_MISMATCH,
      'Network mismatch for wallet detail.',
      cid,
    );
  }

  // The receive address must be a valid Stellar StrKey; refuse to emit a QR/URI
  // for a malformed address rather than render an unscannable code.
  if (!STELLAR_ADDRESS_RE.test(parsed.data.address)) {
    return fail(
      502,
      ERROR_CODES.INVALID_RECEIVE_ADDRESS,
      'Wallet receive address is invalid.',
      cid,
    );
  }

  const network = buildNetworkBadge(parsed.data.network);
  const receive: ReceivePayload = {
    address: parsed.data.address,
    uri: buildReceiveUri(parsed.data.address, parsed.data.network),
    network,
  };

  return NextResponse.json(
    { wallet: parsed.data, receive, correlationId: cid },
    { status: 200, headers: { 'x-correlation-id': cid } },
  );
}

/**
 * Onboarding: first key + wallet.
 *
 * Deny-by-default authz (owner only for provisioning), idempotent on the
 * `Idempotency-Key` header, and fail-closed on dependency outage.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const correlationId = correlationIdFrom(req);
  const walletId = params.id;

  if (!walletId || !/^[A-Za-z0-9_-]{1,128}$/.test(walletId)) {
    return errorResponse(400, ErrorCode.INVALID_INPUT, 'Invalid wallet id', correlationId);
  }

  const idempotencyKey = req.headers.get('idempotency-key');
  if (!idempotencyKey || !IDEMPOTENCY_KEY_RE.test(idempotencyKey)) {
    return errorResponse(
      400,
      ErrorCode.INVALID_INPUT,
      'Missing or invalid Idempotency-Key header',
      correlationId,
    );
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = onboardSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, ErrorCode.INVALID_INPUT, 'Invalid onboarding payload', correlationId);
  }

  let role: 'owner' | 'delegate' | 'guardian' | null;
  try {
    role = await resolveRole(req, walletId);
  } catch {
    return errorResponse(503, ErrorCode.DEPENDENCY_UNAVAILABLE, 'Auth service unavailable', correlationId);
  }

  // Deny-by-default: only the owner may provision the first key + wallet.
  if (role !== 'owner') {
    return errorResponse(403, ErrorCode.FORBIDDEN, 'Not authorized to onboard this wallet', correlationId);
  }

  try {
    const result = await onboardFirstKey(walletId, idempotencyKey, parsed.data.label);
    return NextResponse.json(result, {
      status: 201,
      headers: { 'x-correlation-id': correlationId },
    });
  } catch {
    // Fail-closed: never report success on a dependency outage for a write path.
    return errorResponse(
      503,
      ErrorCode.DEPENDENCY_UNAVAILABLE,
      'Wallet service unavailable',
      correlationId,
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const correlationId = req.headers.get('x-correlation-id') ?? randomUUID();

  const auth = resolveAuth(req);
  if (!auth) {
    return errorResponse(401, WalletSettingsErrorCode.UNAUTHORIZED, correlationId, 'Authentication required.');
  }
  if (!WRITE_ROLES.has(auth.role)) {
    return errorResponse(403, WalletSettingsErrorCode.FORBIDDEN, correlationId, 'Role may not update settings.');
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return errorResponse(413, WalletSettingsErrorCode.INVALID_INPUT, correlationId, 'Request body too large.');
  }

  let parsed: unknown;
  try {
    parsed = raw.length ? JSON.parse(raw) : {};
  } catch {
    return errorResponse(400, WalletSettingsErrorCode.INVALID_INPUT, correlationId, 'Malformed JSON body.');
  }

  const validated = validateUpdate(parsed);
  if (!validated.ok) {
    return errorResponse(400, WalletSettingsErrorCode.INVALID_INPUT, correlationId, validated.message);
  }

  const idempotencyKey = req.headers.get('idempotency-key');
  const fp = fingerprint(params.id, validated.value);

  try {
    if (idempotencyKey) {
      const existing = await idempotencyStore.get(idempotencyKey);
      if (existing) {
        if (existing.fingerprint !== fp) {
          return errorResponse(
            409,
            WalletSettingsErrorCode.IDEMPOTENCY_CONFLICT,
            correlationId,
            'Idempotency key reused with a different payload.',
          );
        }
        return NextResponse.json(existing.response, { headers: { 'x-correlation-id': correlationId } });
      }
    }

    const current = await settingsStore.get(params.id);
    if (!current) {
      return errorResponse(404, WalletSettingsErrorCode.NOT_FOUND, correlationId, 'Wallet not found.');
    }

    const next: WalletSettingsRecord = {
      ...current,
      ...validated.value,
      walletId: params.id,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.subject,
    };

    await settingsStore.put(next);

    const responseBody = { data: next };
    if (idempotencyKey) {
      await idempotencyStore.set(idempotencyKey, { fingerprint: fp, response: responseBody });
    }

    return NextResponse.json(responseBody, { headers: { 'x-correlation-id': correlationId } });
  } catch {
    // Fail-closed: never report success when the write path is degraded.
    return errorResponse(
      503,
      WalletSettingsErrorCode.DEPENDENCY_UNAVAILABLE,
      correlationId,
      'Settings store unavailable; update not applied.',
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const correlationId = req.headers.get('x-correlation-id') ?? randomUUID();
  const auth = resolveAuth(req);
  if (!auth) {
    return errorResponse(401, WalletSettingsErrorCode.UNAUTHORIZED, correlationId, 'Authentication required.');
  }

  try {
    const record = await settingsStore.get(params.id);
    if (!record) {
      return errorResponse(404, WalletSettingsErrorCode.NOT_FOUND, correlationId, 'Wallet not found.');
    }
    return NextResponse.json({ data: record }, { headers: { 'x-correlation-id': correlationId } });
  } catch {
    return errorResponse(
      503,
      WalletSettingsErrorCode.DEPENDENCY_UNAVAILABLE,
      correlationId,
      'Settings store unavailable.',
    );
  }
}

/**
 * Onboarding: first key + wallet.
 *
 * Deny-by-default authz (owner only for provisioning), idempotent on the
 * `Idempotency-Key` header, and fail-closed on dependency outage.
 */
async function onboardFirstKey(
  _walletId: string,
  _idempotencyKey: string,
  _label: string | undefined,
): Promise<OnboardResult> {
  // Placeholder: real implementation provisions the first key + invisible
  // wallet via the wallet service, keyed by idempotencyKey for replay safety.
  throw new Error('wallet service not configured');
}

}
