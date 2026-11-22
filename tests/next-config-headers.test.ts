import { describe, it, expect, vi, afterEach } from 'vitest';

// `next.config.ts` calls `validateEnv()` at import time; stub it so the test
// exercises the `headers` function, not environment validation.
vi.mock('../src/lib/env', () => ({
  validateEnv: vi.fn(),
}));

import nextConfig, {
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

describe('next.config headers()', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('applies the CSP header to every path', async () => {
    const rules = await nextConfig.headers!();

    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe('/:path*');
    expect(rules[0].headers).toHaveLength(1);
    expect(rules[0].headers[0].key).toBe('Content-Security-Policy');
  });

  it('emits the connect-src directive derived from the validated allowlist', async () => {
    delete process.env.NEXT_PUBLIC_API_ORIGINS;
    const rules = await nextConfig.headers!();
    const value = rules[0].headers[0].value;

    expect(value).toBe(buildConnectSrcDirective());
    expect(value).toContain("default-src 'self'");
    expect(value).toContain(`connect-src ${resolveConnectSrcOrigins().join(' ')}`);

    const sources = directiveSources(value.split('; ').find((d) => d.startsWith('connect-src'))!);
    expect(sources).toContain("'self'");
    for (const forbidden of ['*', 'http:', 'https:', 'ws:', 'wss:', 'data:', 'blob:']) {
      expect(sources).not.toContain(forbidden);
    }
  });

  it('fails when the header stops being the full CSP policy', async () => {
    const rules = await nextConfig.headers!();
    const value = rules[0].headers[0].value;

    // Regression guard: the value must be the complete policy string, not the
    // bare connect-src directive or the intermediate array.
    expect(value).not.toBe(buildConnectSrcDirective());
    expect(value).not.toEqual(resolveConnectSrcOrigins());
    expect(value).toContain('; ');
  });

  it('does not widen the header when NEXT_PUBLIC_API_ORIGINS is hostile', async () => {
    delete process.env.NEXT_PUBLIC_API_ORIGINS;
    const baseline = (await nextConfig.headers!())[0].headers[0].value;

    process.env.NEXT_PUBLIC_API_ORIGINS = '*, https:, http://evil.example';
    const hostile = (await nextConfig.headers!())[0].headers[0].value;

    expect(hostile).toBe(baseline);
    expect(hostile).not.toContain('http://evil.example');
  });
});
