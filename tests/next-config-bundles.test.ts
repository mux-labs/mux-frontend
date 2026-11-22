import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Regression guard for issue #1156: `bundles` in `next.config.ts` must keep
 * doing what its comment documents — gzip/brotli compression of responses
 * (`compress: true`) plus incremental client-chunk preparation for large
 * bundles (`experimental.optimizePackageImports`).
 *
 * The config module is read as source (not imported) because importing it
 * runs `validateEnv()` at module load, which is fail-closed in production.
 */

const repoRoot = resolve(__dirname, '..');
const source = readFileSync(resolve(repoRoot, 'next.config.ts'), 'utf8');

/** Extract the `nextConfig` object literal from the config source. */
function nextConfigObject(): string {
  const start = source.indexOf('const nextConfig = {');
  expect(start, 'next.config.ts must define `const nextConfig = {`').toBeGreaterThan(-1);
  const end = source.indexOf('\nexport default nextConfig;', start);
  expect(end, 'next.config.ts must export nextConfig').toBeGreaterThan(start);
  return source.slice(start, end);
}

/** Extract the `experimental` block from the config object. */
function experimentalBlock(config: string): string {
  const start = config.indexOf('experimental: {');
  expect(start, 'nextConfig must define an `experimental` block').toBeGreaterThan(-1);
  const end = config.indexOf('},', start);
  expect(end, 'experimental block must be closed').toBeGreaterThan(start);
  return config.slice(start, end);
}

describe('next.config.ts bundles compression contract', () => {
  it('enables gzip/brotli response compression', () => {
    const config = nextConfigObject();
    expect(config).toMatch(/compress:\s*true\b/);
    expect(config).not.toMatch(/compress:\s*false\b/);
  });

  it('documents the compression behavior next to the flag', () => {
    expect(source).toMatch(/Compress responses with gzip \/ brotli/);
  });

  it('enables granular code-splitting for large client bundles', () => {
    const experimental = experimentalBlock(nextConfigObject());
    expect(experimental).toMatch(/optimizePackageImports:\s*\[/);
    expect(experimental).toMatch(/"@\/components\/analytics"/);
    expect(experimental).toMatch(/"@\/components\/dashboard"/);
  });

  it('fails when compression is disabled (failure path)', () => {
    const broken = nextConfigObject().replace(/compress:\s*true\b/, 'compress: false');
    expect(broken).not.toMatch(/compress:\s*true\b/);
    expect(broken).toMatch(/compress:\s*false\b/);
  });

  it('fails when the bundle-splitting list is emptied (failure path)', () => {
    const broken = experimentalBlock(nextConfigObject()).replace(
      /optimizePackageImports:\s*\[[^\]]*\]/,
      'optimizePackageImports: []',
    );
    expect(broken).not.toMatch(/"@\/components\/analytics"/);
    expect(broken).not.toMatch(/"@\/components\/dashboard"/);
  });
});
