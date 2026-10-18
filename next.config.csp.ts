interface CSPDirective {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'frame-src'?: string[];
  'object-src'?: string[];
  'base-uri'?: string[];
  'form-action'?: string[];
  'frame-ancestors'?: string[];
  'report-uri'?: string[];
  'report-to'?: string[];
}

/**
 * Safe, explicit defaults for the API origins the frontend is allowed to
 * connect to. These are the only origins permitted when no environment
 * override is provided; there is intentionally no wildcard or broad scheme
 * source so the policy fails closed.
 */
export const DEFAULT_CONNECT_SRC_ORIGINS: readonly string[] = [
  'https://api.muxprotocol.io',
  'https://soroban-testnet.stellar.org',
  'https://horizon-testnet.stellar.org',
  'https://horizon.stellar.org',
];

/**
 * Broad scheme sources that must never appear as a standalone connect-src
 * entry. Kept as a single typed source of truth so tests can assert the
 * fail-closed contract documented in the README.
 */
export const BROAD_SCHEME_SOURCES: readonly string[] = [
  '*',
  'http:',
  'https:',
  'ws:',
  'wss:',
  'data:',
  'blob:',
];

/**
 * Parse a comma-separated allowlist of origins from an environment variable.
 * Only absolute https origins are accepted; wildcards, broad schemes, and
 * malformed entries are dropped so an unset or bad value cannot silently
 * widen the policy.
 */
export function parseConnectSrcOrigins(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => {
      if (origin.length === 0 || BROAD_SCHEME_SOURCES.includes(origin)) {
        return false;
      }
      try {
        const url = new URL(origin);
        return url.protocol === 'https:' && url.origin === origin;
      } catch {
        return false;
      }
    });
}

/**
 * Resolve the connect-src allowlist from a single typed source: the explicit
 * defaults plus any valid origins from NEXT_PUBLIC_API_URL and
 * NEXT_PUBLIC_CONNECT_SRC_ALLOWLIST. Always includes 'self' and never emits a
 * wildcard, so unknown or unset origins are not permitted.
 */
export function resolveConnectSrcOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = [
    ...parseConnectSrcOrigins(env.NEXT_PUBLIC_API_URL),
    ...parseConnectSrcOrigins(env.NEXT_PUBLIC_CONNECT_SRC_ALLOWLIST),
  ];
  const origins = new Set<string>([...DEFAULT_CONNECT_SRC_ORIGINS, ...configured]);
  return ["'self'", ...origins];
}

/**
 * Build the resolved connect-src directive string (e.g. "connect-src 'self'
 * https://..."). This is the exact value emitted in the CSP header, so tests
 * can assert on the joined directive rather than the intermediate array.
 */
export function buildConnectSrcDirective(env: NodeJS.ProcessEnv = process.env): string {
  return `connect-src ${resolveConnectSrcOrigins(env).join(' ')}`;
}

/**
 * Backwards-compatible alias for the connect-src allowlist resolver.
 */
export function getConnectSrcAllowlist(env: NodeJS.ProcessEnv = process.env): string[] {
  return resolveConnectSrcOrigins(env);
}

export function buildCSPHeader(directives: CSPDirective): string {
  const parts = Object.entries(directives).map(([directive, sources]) => {
    if (sources && sources.length > 0) {
      return `${directive} ${sources.join(' ')}`;
    }
    return directive;
  });
  return parts.join('; ');
}

export function getNextConfigCSP(): Record<string, string[]> {
  return {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", "data:", "https:"],
    'font-src': ["'self'", "https:"],
    'connect-src': resolveConnectSrcOrigins(),
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'report-uri': ['/api/csp-report'],
  };
}

export function validateHeaders(headers: Record<string, string[]>): { valid: boolean; missing: string[] } {
  const required = ['x-content-type-options', 'x-frame-options', 'strict-transport-security'];
  const missing = required.filter((h) => !headers[h]);
  return { valid: missing.length === 0, missing };
}
