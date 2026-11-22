import { describe, it, expect, afterEach } from 'vitest';
import {
  DEFAULT_CONNECT_SRC_ORIGINS,
  buildConnectSrcDirective,
  resolveConnectSrcOrigins,
} from '../next.config';

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

/**
 * Regression guard for issue #1155: buildConnectSrcDirective in next.config.ts
 * must emit the full `connect-src` directive value built from the resolved
 * allowlist, and must never emit an empty directive (fail-closed fallback).
 */
describe('buildConnectSrcDirective (next.config.ts)', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('builds the directive value from the resolved allowlist', () => {
    delete process.env.NEXT_PUBLIC_API_ORIGINS;
    const resolved = resolveConnectSrcOrigins();

    expect(buildConnectSrcDirective()).toBe(`connect-src ${resolved.join(' ')}`);
  });

  it('prefixes the directive with connect-src and joins sources with spaces', () => {
    const directive = buildConnectSrcDirective(["'self'", 'https://a.test']);

    expect(directive).toBe("connect-src 'self' https://a.test");
    expect(directive.startsWith('connect-src ')).toBe(true);
    expect(directive).not.toContain(',');
  });

  it('includes self and every default origin', () => {
    delete process.env.NEXT_PUBLIC_API_ORIGINS;
    const sources = directiveSources(buildConnectSrcDirective());

    expect(sources).toContain("'self'");
    for (const origin of DEFAULT_CONNECT_SRC_ORIGINS) {
      expect(sources).toContain(origin);
    }
  });

  it('fails closed to self when the resolved allowlist is empty', () => {
    // Failure path named in the function comment: the directive is never empty.
    expect(buildConnectSrcDirective([])).toBe("connect-src 'self'");
    expect(directiveSources(buildConnectSrcDirective([]))).toEqual(["'self'"]);
  });

  it('fails when the function stops producing the joined directive', () => {
    const directive = buildConnectSrcDirective(["'self'", 'https://a.test']);

    // Regression guard: the emitted value must be the full directive string,
    // not the intermediate array or a bare source list.
    expect(directive).not.toEqual(["'self'", 'https://a.test']);
    expect(directive).not.toBe("'self' https://a.test");
  });
});
