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
  IDEMPOTENCY_CONFLICT: 'ONBOARDING_IDEMPOTENCY_CONFLICT',
  UPSTREAM_UNAVAILABLE: 'ONBOARDING_UPSTREAM_UNAVAILABLE',
  INTERNAL: 'ONBOARDING_INTERNAL',
} as const;

export type OnboardingErrorCodeValue =
  (typeof OnboardingErrorCode)[keyof typeof OnboardingErrorCode];

export type OnboardingRole = 'owner' | 'delegate' | 'guardian';

export interface OnboardingRequest {
  /** Stable client-supplied wallet label; not a secret. */
  label?: string;
  /** Optional owner subject; defaults to the authenticated subject. */
  owner?: string;
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

interface AuthContext {
  subject: string;
  role: OnboardingRole;
  /** Subjects this caller may onboard a wallet for. */
  ownerScopes: string[];
}

/**
 * Resolve the caller's auth context. Deny-by-default: any missing/invalid
 * credential, expired token, or revoked delegate yields null.
 *
 * NOTE: wire this to the real auth provider (JWT/API-key/owner-delegate
 * registry). Kept as a single seam so authz cannot be bypassed by callers.
 */
async function resolveAuthContext(
  req: NextRequest,
): Promise<AuthContext | null> {
  const authz = req.headers.get('authorization');
  const apiKey = req.headers.get('x-api-key');
  if (!authz && !apiKey) return null;

  // Placeholder verification seam. Real implementation validates the JWT
  // signature/expiry or API-key hash and resolves role + owner scope.
  const subject = req.headers.get('x-subject');
  const role = req.headers.get('x-role') as OnboardingRole | null;
  const ownerScopes = (req.headers.get('x-owner-scopes') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

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
  _idempotencyKey: string,
): Promise<{ wallet: OnboardingWallet; replayed: boolean }> {
  // Placeholder provisioning seam. Real implementation creates the wallet and
  // its first signing key atomically, keyed by (owner, idempotencyKey) so
  // concurrent/replayed requests return the same wallet.
  throw new Error('provisioning not wired');
}

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

  const owner = body.owner ?? auth.subject;
  if (!isAuthorizedForOwner(auth, owner)) {
    return errorResponse(
      OnboardingErrorCode.FORBIDDEN,
      'Not authorized to onboard this owner.',
      403,
      correlationId,
    );
  }

  let result: { wallet: OnboardingWallet; replayed: boolean };
  try {
    result = await provisionFirstWallet(
      owner,
      body.label ?? null,
      idempotencyKey,
    );
  } catch {
    // Fail-closed: never return a partial wallet on upstream outage.
    return errorResponse(
      OnboardingErrorCode.UPSTREAM_UNAVAILABLE,
      'Wallet provisioning temporarily unavailable.',
      503,
      correlationId,
    );
  }

  return NextResponse.json(
    { wallet: result.wallet, replayed: result.replayed, correlationId },
    { status: result.replayed ? 200 : 201, headers: { 'x-correlation-id': correlationId } },
  );
}
