/**
 * Fail-closed connect-src construction for the Content-Security-Policy header.
 *
 * This is the single typed source of truth for the connect-src directive.
 * It is environment-driven with safe defaults and never falls back to a
 * wildcard or a broad scheme source.
 */

export const DEFAULT_CONNECT_SRC_ORIGINS = [
  "'self'",
  "https://api.muxprotocol.io",
  "https://soroban-testnet.stellar.org",
  "https://horizon-testnet.stellar.org",
  "https://horizon.stellar.org",
] as const;

/**
 * Broad scheme / wildcard sources that must never appear as a standalone
 * connect-src entry. Any configured origin matching one of these is dropped.
 */
export const BROAD_SCHEME_SOURCES = [
  "*",
  "http:",
  "https:",
  "ws:",
  "wss:",
  "data:",
  "blob:",
] as const;

const BROAD_SCHEME_SET = new Set<string>(BROAD_SCHEME_SOURCES);

function isBroadSchemeSource(source: string): boolean {
  return BROAD_SCHEME_SET.has(source.trim().toLowerCase());
}

/**
 * Resolve the connect-src origins from the environment, falling back to the
 * documented defaults. Broad scheme / wildcard sources are filtered out so a
 * hostile NEXT_PUBLIC_API_ORIGINS value cannot widen the directive.
 */
export function resolveConnectSrcOrigins(
  rawOrigins: string | undefined = process.env.NEXT_PUBLIC_API_ORIGINS,
): string[] {
  const origins = new Set<string>(DEFAULT_CONNECT_SRC_ORIGINS);

  if (rawOrigins) {
    for (const candidate of rawOrigins.split(",")) {
      const origin = candidate.trim();
      if (!origin || isBroadSchemeSource(origin)) {
        continue;
      }
      origins.add(origin);
    }
  }

  return Array.from(origins);
}

/**
 * Build the full connect-src directive string (e.g. "connect-src 'self' ...").
 */
export function buildConnectSrcDirective(
  rawOrigins: string | undefined = process.env.NEXT_PUBLIC_API_ORIGINS,
): string {
  return `connect-src ${resolveConnectSrcOrigins(rawOrigins).join(" ")}`;
}
