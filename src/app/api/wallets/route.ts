import { NextRequest, NextResponse } from 'next/server';

/**
 * Wallet onboarding endpoint: first key + wallet.
 *
 * Creates the caller's first invisible wallet and provisions its first
 * signing key. Typed request/response with stable error codes and a
 * correlation id on every response. Deny-by-default authz: the caller must
 * present a valid owner/delegate/guardian/API-key/JWT credential and may only
 * onboard a wallet they are authorized to own. Idempotent on the
 * `Idempotency-Key` header so concurrent/replayed requests cannot create
 * duplicate wallets or keys. Fail-closed on upstream (RPC/DB/Horizon) outage.
 */

export const runtime = 'nodejs';

/** Stable error codes surfaced to clients (never leak internals). */
export const OnboardingErrorCode = {
  UNAUTHORIZED: 'ONBOARDING_UNAUTHORIZED',
  FORBIDDEN: 'ONBOARDING_FORBIDDEN',
  INVALID_REQUEST: 'ONBOARDING_INVALID_REQUEST',
  INVALID_NETWORK: 'ONBOARDING_INVALID_NETWORK',
  NETWORK_DISABLED: 'ONBOARDING_NETWORK_DISABLED',
  IDEMPOTENCY_CONFLICT: 'ONBOARDING_IDEMPOTENCY_CONFLICT',
  UPSTREAM_UNAVAILABLE: 'ONBOARDING_UPSTREAM_UNAVAILABLE',
  INTERNAL: 'ONBOARDING_INTERNAL',
} as const;

export type OnboardingErrorCodeValue =
  (typeof OnboardingErrorCode)[keyof typeof OnboardingErrorCode];

export type OnboardingRole = 'owner' | 'delegate' | 'guardian';

export type OnboardingNetwork = 'testnet' | 'mainnet';

/** Mainnet onboarding is off unless explicitly enabled (kill-switch). */
function isMainnetEnabled(): boolean {
  return process.env.MUX_MAINNET_ENABLED === 'true';
}

export interface OnboardingRequest {
  /** Stable client-supplied wallet label; not a secret. */
  label?: string;
  /** Optional owner subject; defaults to the authenticated subject. */
  owner?: string;
  /** Target Stellar network; defaults to `testnet`. */
  network?: OnboardingNetwork;
}

export interface OnboardingKey {
  /** Opaque key id; never the raw key material. */
  keyId: string;
  /** Public key only; private material never leaves the signer. */
  publicKey: string;
  algorithm: string;
  createdAt: string;
}

export interface OnboardingWallet {
  walletId: string;
  owner: string;
  label: string | null;
  network: OnboardingNetwork;
  status: 'active';
  createdAt: string;
  firstKey: OnboardingKey;
}

export interface OnboardingResponse {
  wallet: OnboardingWallet;
  /** True when this response replays a prior idempotent request. */
  replayed: boolean;
  correlationId: string;
}

export interface OnboardingErrorBody {
  error: {
    code: OnboardingErrorCodeValue;
    message: string;
    correlationId: string;
  };
}

export interface AuthContext {
  subject: string;
  role: OnboardingRole;
  /** Subjects this caller may onboard a wallet for. */
  ownerScopes: string[];
}

/**
 * Verify the presented credential and return its claims, or null when the
 * credential is missing, malformed, or unverifiable. Deny-by-default: nothing
 * is trusted until the signature/hash is checked.
 *
 * NOTE: wire this to the real auth provider (JWT signature/expiry check or
 * API-key hash lookup + owner-delegate registry). Kept as a single seam so
 * authz cannot be bypassed by callers. Client-supplied `x-subject`, `x-role`,
 * and `x-owner-scopes` headers are intentionally ignored.
 */
async function verifyCredential(
  _authz: string | null,
  _apiKey: string | null,
): Promise<{ subject: string; role: string; ownerScopes: string[] } | null> {
  // Placeholder verification seam. Real implementation validates the JWT
  // signature/expiry or API-key hash and resolves role + owner scope from the
  // verified claims. Until wired, no credential verifies, so every request is
  // denied (fail-closed).
  return null;
}

/**
 * Resolve the caller's auth context. Deny-by-default: any missing/invalid
 * credential, expired token, or revoked delegate yields null. Subject, role,
 * and owner scopes come only from the verified credential.
 */
export async function resolveAuthContext(
  req: NextRequest,
): Promise<AuthContext | null> {
  const authz = req.headers.get('authorization');
  const apiKey = req.headers.get('x-api-key');
  if (!authz && !apiKey) return null;

  const claims = await verifyCredential(authz, apiKey);
  if (!claims) return null;

  const { subject, role, ownerScopes } = claims;
  if (!subject || !role) return null;
  if (role !== 'owner' && role !== 'delegate' && role !== 'guardian') {
    return null;
  }
  return { subject, role, ownerScopes };
}

function isAuthorizedForOwner(auth: AuthContext, owner: string): boolean {
  // Deny-by-default: caller must be explicitly scoped to the owner.
  return auth.ownerScopes.includes(owner);
}

function isNetwork(value: unknown): value is OnboardingNetwork {
  return value === 'testnet' || value === 'mainnet';
}

function parseBody(raw: unknown): OnboardingRequest | null {
  if (raw === null || typeof raw !== 'object') return null;
  const body = raw as Record<string, unknown>;
  const out: OnboardingRequest = {};
  if (body.label !== undefined) {
    if (typeof body.label !== 'string' || body.label.length > 128) return null;
    out.label = body.label;
  }
  if (body.owner !== undefined) {
    if (typeof body.owner !== 'string' || body.owner.length === 0) return null;
    out.owner = body.owner;
  }
  if (body.network !== undefined) {
    if (typeof body.network !== 'string') return null;
    out.network = body.network as OnboardingNetwork;
  }
  return out;
}

function errorResponse(
  code: OnboardingErrorCodeValue,
  message: string,
  status: number,
  correlationId: string,
): NextResponse<OnboardingErrorBody> {
  return NextResponse.json(
    { error: { code, message, correlationId } },
    { status, headers: { 'x-correlation-id': correlationId } },
  );
}

/**
 * Provision the first wallet + key from the source of truth. Fail-closed: any
 * upstream (RPC/DB/Horizon) failure throws so the caller returns a 503 rather
 * than a partial/incorrect wallet. Idempotent on (owner, idempotencyKey).
 */
async function provisionFirstWallet(
  _owner: string,
  _label: string | null,
  _network: OnboardingNetwork,
  _idempotencyKey: string,
): Promise<{ wallet: OnboardingWallet; replayed: boolean }> {
  // Placeholder provisioning seam. Real implementation creates the wallet and
  // its first signing key atomically, keyed by (owner, idempotencyKey) so
  // concurrent/replayed requests return the same wallet.
  throw new Error('provisioning not wired');
}

/**
 * Test-only export of the provisioning seam so a focused regression test can
 * assert its documented contract (fail-closed on upstream failure, idempotent
 * on (owner, idempotencyKey)). Not part of the public HTTP surface.
 */
export const __test__ = { provisionFirstWallet };

export async function POST(
  req: NextRequest,
): Promise<NextResponse<OnboardingResponse | OnboardingErrorBody>> {
  const correlationId =
    req.headers.get('x-correlation-id') ?? crypto.randomUUID();

  const auth = await resolveAuthContext(req);
  if (!auth) {
    return errorResponse(
      OnboardingErrorCode.UNAUTHORIZED,
      'Authentication required.',
      401,
      correlationId,
    );
  }

  const idempotencyKey = req.headers.get('idempotency-key');
  if (!idempotencyKey || idempotencyKey.length > 255) {
    return errorResponse(
      OnboardingErrorCode.INVALID_REQUEST,
      'Idempotency-Key header is required.',
      400,
      correlationId,
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorResponse(
      OnboardingErrorCode.INVALID_REQUEST,
      'Request body must be valid JSON.',
      400,
      correlationId,
    );
  }

  const body = parseBody(raw);
  if (!body) {
    return errorResponse(
      OnboardingErrorCode.INVALID_REQUEST,
      'Request body is malformed.',
      400,
      correlationId,
    );
  }

  const network = body.network ?? 'testnet';
  if (!isNetwork(network)) {
    return errorResponse(
      OnboardingErrorCode.INVALID_NETWORK,
      'network must be "testnet" or "mainnet".',
      400,
      correlationId,
    );
  }
  if (network === 'mainnet' && !isMainnetEnabled()) {
    return errorResponse(
      OnboardingErrorCode.NETWORK_DISABLED,
      'Mainnet onboarding is not enabled.',
      403,
      correlationId,
    );
  }

  const owner = body.owner ?? auth.subject;
  if (!isAuthorizedForOwner(auth, owner)) {
    return errorResponse(
      OnboardingErrorCode.FORBIDDEN,
      'Caller is not authorized to onboard this owner.',
      403,
      correlationId,
    );
  }

      'Caller is not authorized to onboard this owner.',
      owner,
      body.label ?? null,
      network,
      idempotencyKey,
    );
    return NextResponse.json(
      { wallet, replayed, correlationId },
      { status: replayed ? 200 : 201, headers: { 'x-correlation-id': correlationId } },
    );
  } catch {

  return NextResponse.json(
    {
      wallet: provisioned.wallet,
      replayed: provisioned.replayed,
      correlationId,
    },
    { status: provisioned.replayed ? 200 : 201, headers: { 'x-correlation-id': correlationId } },
  );

    return errorResponse(
      OnboardingErrorCode.UPSTREAM_UNAVAILABLE,
      'Wallet provisioning is temporarily unavailable.',
      503,
      correlationId,
    );
  }
    // Fail-closed: never return a partial/incorrect wallet on upstream failure.
    return errorResponse(
      OnboardingErrorCode.UPSTREAM_UNAVAILABLE,
      'Wallet provisioning is temporarily unavailable.',
      503,
      correlationId,
    );
  }
}
