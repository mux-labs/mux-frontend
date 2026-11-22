import { describe, it, expect, afterEach } from 'vitest';
import {
  BROAD_SCHEME_SOURCES,
  DEFAULT_CONNECT_SRC_ORIGINS,
  resolveConnectSrcOrigins,
  buildConnectSrcDirective,
} from '../src/lib/csp/connect-src';

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

describe('connect-src broad scheme Set membership', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('never emits a broad scheme or wildcard as a standalone entry', () => {
    delete process.env.NEXT_PUBLIC_API_ORIGINS;
    const sources = directiveSources(buildConnectSrcDirective());

    for (const broad of BROAD_SCHEME_SOURCES) {
      expect(sources).not.toContain(broad);
    }
    for (const forbidden of ['*', 'http:', 'https:', 'ws:', 'wss:', 'data:', 'blob:']) {
      expect(sources).not.toContain(forbidden);
    }
  });

  it('drops every configured origin that matches a broad scheme source', () => {
    delete process.env.NEXT_PUBLIC_API_ORIGINS;
    const baseline = resolveConnectSrcOrigins();

    process.env.NEXT_PUBLIC_API_ORIGINS = BROAD_SCHEME_SOURCES.join(',');
    const resolved = resolveConnectSrcOrigins();

    expect(resolved).toEqual(baseline);
    for (const broad of BROAD_SCHEME_SOURCES) {
      expect(resolved).not.toContain(broad);
    }
  });

  it('drops broad scheme sources even when padded or upper-cased', () => {
    delete process.env.NEXT_PUBLIC_API_ORIGINS;
    const baseline = resolveConnectSrcOrigins();

    process.env.NEXT_PUBLIC_API_ORIGINS = '  HTTPS: , WSS: ,* ,  Data:  ';
    const resolved = resolveConnectSrcOrigins();

    expect(resolved).toEqual(baseline);
    for (const broad of BROAD_SCHEME_SOURCES) {
      expect(resolved).not.toContain(broad);
    }
  });

  it('keeps concrete origins while dropping broad scheme sources (failure path)', () => {
    delete process.env.NEXT_PUBLIC_API_ORIGINS;

    process.env.NEXT_PUBLIC_API_ORIGINS =
      'https://api.example.com, *, https:, https://rpc.example.com, wss:';
    const resolved = resolveConnectSrcOrigins();

    expect(resolved).toContain('https://api.example.com');
    expect(resolved).toContain('https://rpc.example.com');
    for (const origin of DEFAULT_CONNECT_SRC_ORIGINS) {
      expect(resolved).toContain(origin);
    }
    for (const broad of BROAD_SCHEME_SOURCES) {
      expect(resolved).not.toContain(broad);
    }
  });
});
