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
