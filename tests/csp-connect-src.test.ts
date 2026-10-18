import { describe, it, expect, afterEach } from 'vitest';
import {
  DEFAULT_CONNECT_SRC_ORIGINS,
  BROAD_SCHEME_SOURCES,
  resolveConnectSrcOrigins,
  buildConnectSrcDirective,
} from '../next.config.csp';

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_API_ORIGINS;

function restoreEnv() {
  if (ORIGINAL_ENV === undefined) {
    delete process.env.NEXT_PUBLIC_API_ORIGINS;
  } else {
    process.env.NEXT_PUBLIC_API_ORIGINS = ORIGINAL_ENV;
  }
}

function directiveSources(directive: string): string[] {
  return directive
    .replace(/^connect-src\s+/, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

describe('CSP connect-src fail-closed contract', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('includes self and all default origins', () => {
    delete process.env.NEXT_PUBLIC_API_ORIGINS;
    const directive = buildConnectSrcDirective(resolveConnectSrcOrigins());
    const sources = directiveSources(directive);

    expect(sources).toContain("'self'");
    for (const origin of DEFAULT_CONNECT_SRC_ORIGINS) {
      expect(sources).toContain(origin);
    }
    expect(sources).toContain('https://api.muxprotocol.io');
    expect(sources).toContain('https://soroban-testnet.stellar.org');
    expect(sources).toContain('https://horizon-testnet.stellar.org');
    expect(sources).toContain('https://horizon.stellar.org');
  });

  it('contains no wildcard or broad scheme sources', () => {
    delete process.env.NEXT_PUBLIC_API_ORIGINS;
    const sources = directiveSources(buildConnectSrcDirective(resolveConnectSrcOrigins()));

    for (const broad of BROAD_SCHEME_SOURCES) {
      expect(sources).not.toContain(broad);
    }
    for (const forbidden of ['*', 'http:', 'https:', 'ws:', 'wss:', 'data:', 'blob:']) {
      expect(sources).not.toContain(forbidden);
    }
  });

  it('does not widen when NEXT_PUBLIC_API_ORIGINS is hostile', () => {
    delete process.env.NEXT_PUBLIC_API_ORIGINS;
    const baseline = buildConnectSrcDirective(resolveConnectSrcOrigins());

    process.env.NEXT_PUBLIC_API_ORIGINS = '*, https:, http://evil.example';
    const hostile = buildConnectSrcDirective(resolveConnectSrcOrigins());

    expect(hostile).toBe(baseline);

    const sources = directiveSources(hostile);
    expect(sources).toContain("'self'");
    for (const forbidden of ['*', 'http:', 'https:', 'ws:', 'wss:', 'data:', 'blob:']) {
      expect(sources).not.toContain(forbidden);
    }
    expect(sources).not.toContain('http://evil.example');
  });
});
