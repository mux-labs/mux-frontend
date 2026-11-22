import { describe, it, expect, afterEach } from 'vitest';
import {
  DEFAULT_CONNECT_SRC_ORIGINS,
  BROAD_SCHEME_SOURCES,
  resolveConnectSrcOrigins,
} from '../src/lib/csp/connect-src';

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_API_ORIGINS;

function restoreEnv() {
  if (ORIGINAL_ENV === undefined) {
    delete process.env.NEXT_PUBLIC_API_ORIGINS;
  } else {
    process.env.NEXT_PUBLIC_API_ORIGINS = ORIGINAL_ENV;
  }
}

describe('resolveConnectSrcOrigins (src/lib/csp/connect-src)', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('falls back to the documented defaults when the env var is unset', () => {
    delete process.env.NEXT_PUBLIC_API_ORIGINS;
    const origins = resolveConnectSrcOrigins();

    expect(origins).toContain("'self'");
    for (const origin of DEFAULT_CONNECT_SRC_ORIGINS) {
      expect(origins).toContain(origin);
    }
    expect(origins).toHaveLength(DEFAULT_CONNECT_SRC_ORIGINS.length + 1);
  });

  it('reads origins from the environment and keeps the defaults', () => {
    process.env.NEXT_PUBLIC_API_ORIGINS = 'https://api.example.com, https://rpc.example.com';
    const origins = resolveConnectSrcOrigins();

    expect(origins).toContain('https://api.example.com');
    expect(origins).toContain('https://rpc.example.com');
    for (const origin of DEFAULT_CONNECT_SRC_ORIGINS) {
      expect(origins).toContain(origin);
    }
  });

  it('filters broad scheme and wildcard sources from a hostile env value', () => {
    process.env.NEXT_PUBLIC_API_ORIGINS =
      '*, https:, http:, ws:, wss:, data:, blob:, HTTPS:, https://api.example.com';
    const origins = resolveConnectSrcOrigins();

    for (const broad of BROAD_SCHEME_SOURCES) {
      expect(origins).not.toContain(broad);
    }
    expect(origins).not.toContain('HTTPS:');
    expect(origins).toContain('https://api.example.com');
    for (const origin of DEFAULT_CONNECT_SRC_ORIGINS) {
      expect(origins).toContain(origin);
    }
  });

  it('ignores empty entries and never widens the directive', () => {
    delete process.env.NEXT_PUBLIC_API_ORIGINS;
    const baseline = resolveConnectSrcOrigins();

    process.env.NEXT_PUBLIC_API_ORIGINS = ' , ,, ';
    expect(resolveConnectSrcOrigins()).toEqual(baseline);
  });

  it('accepts an explicit argument instead of the environment', () => {
    process.env.NEXT_PUBLIC_API_ORIGINS = 'https://from-env.example.com';
    const origins = resolveConnectSrcOrigins('https://explicit.example.com');

    expect(origins).toContain('https://explicit.example.com');
    expect(origins).not.toContain('https://from-env.example.com');
  });
});
