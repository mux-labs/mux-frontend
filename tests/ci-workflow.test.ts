import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  checkNodeEngine,
  compareVersions,
  MIN_SUPPORTED_NODE_MAJOR,
  parseMinimum,
} from '../scripts/check-node-engine.mjs';
import { checkPackageManager } from '../scripts/check-package-manager.mjs';

const repoRoot = resolve(__dirname, '..');

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

/**
 * Guards for issue #770: the CI typecheck gate must be a required, fail-closed
 * check so PRs cannot merge with TypeScript errors.
 */
describe('CI typecheck required gate', () => {
  it('exposes a typecheck script wired to the TypeScript compiler', () => {
    const pkg = JSON.parse(readRepoFile('package.json')) as {
      scripts?: Record<string, string>;
    };

    const typecheck = pkg.scripts?.typecheck;
    expect(typecheck, 'package.json must define a "typecheck" script').toBeTruthy();
    expect(typecheck).toMatch(/tsc\b/);
    expect(typecheck).toMatch(/--noEmit/);
  });

  it('runs the typecheck script in the CI workflow', () => {
    const workflow = readRepoFile('.github/workflows/ci.yml');

    expect(workflow).toMatch(/typecheck/i);
  });

  it('marks the typecheck job as a required gate (no continue-on-error)', () => {
    const workflow = readRepoFile('.github/workflows/ci.yml');

    // A required gate must fail the workflow on type errors, so the typecheck
    // step/job must not be allowed to continue on error.
    const typecheckBlocks = workflow
      .split(/\n(?=\s{2,}\w)/)
      .filter((block) => /typecheck/i.test(block));

    expect(typecheckBlocks.length).toBeGreaterThan(0);
    for (const block of typecheckBlocks) {
      expect(block).not.toMatch(/continue-on-error:\s*true/i);
    }
  });
});

/**
 * Guards for issue #815: the Vitest gate that runs this file in CI must be
 * able to boot, and must not pick up Playwright specs it cannot execute.
 */
describe('Vitest CI gate boots', () => {
  it.each(['vitest.config.ts', 'vitest.coverage.full.config.ts'])(
    '%s points setupFiles at files that exist',
    (configPath) => {
      const config = readRepoFile(configPath);
      const setupFiles = [...config.matchAll(/setupFiles:\s*\[([^\]]*)\]/g)]
        .flatMap(([, list]) => [...list.matchAll(/["']([^"']+)["']/g)])
        .map(([, file]) => file);

      expect(setupFiles.length).toBeGreaterThan(0);
      for (const file of setupFiles) {
        expect(existsSync(resolve(repoRoot, file)), `${configPath}: ${file}`).toBe(true);
      }
    },
  );

  it.each(['vitest.config.ts', 'vitest.coverage.full.config.ts'])(
    '%s excludes Playwright specs under tests/e2e',
    (configPath) => {
      expect(readRepoFile(configPath)).toMatch(/exclude:[^\n]*tests\/e2e\//);
    },
  );

  it('runs the unit test script in CI without continue-on-error', () => {
    const workflow = readRepoFile('.github/workflows/ci.yml');
    expect(workflow).toMatch(/run:\s*pnpm test\b/);
    expect(workflow).not.toMatch(/continue-on-error:\s*true/i);
  });

  it('installs with a frozen lockfile in every CI job', () => {
    const installs = readRepoFile('.github/workflows/ci.yml').match(/run:\s*pnpm install[^\n]*/g) ?? [];
    expect(installs.length).toBeGreaterThan(0);
    for (const install of installs) {
      expect(install).toMatch(/--frozen-lockfile/);
    }
  });

  it('never ships production browser source maps (README policy)', () => {
    const nextConfig = readRepoFile('next.config.ts');
    expect(nextConfig).toMatch(/productionBrowserSourceMaps:\s*isDevOrTest\b/);
    expect(nextConfig).not.toMatch(/productionBrowserSourceMaps:\s*true/);
    expect(nextConfig).toMatch(
      /isDevOrTest\s*=\s*process\.env\.NODE_ENV === "development" \|\|\s*process\.env\.NODE_ENV === "test"/,
    );
  });
});

/**
 * Guards for issue #817: engines.node is enforced (fail-closed) at install
 * time and every Node pin in the repo satisfies it, never dropping below 18.
 */
describe('engines node>=18 enforced', () => {
  const pkg = JSON.parse(readRepoFile('package.json')) as {
    engines?: { node?: string };
    scripts?: Record<string, string>;
  };
  const range = pkg.engines?.node ?? '';

  it('declares a ">=" engines.node range with a floor of at least Node 18', () => {
    const minimum = parseMinimum(range);
    expect(minimum, `unsupported engines.node range: ${range}`).not.toBeNull();
    expect(minimum?.[0]).toBeGreaterThanOrEqual(MIN_SUPPORTED_NODE_MAJOR);
    expect(MIN_SUPPORTED_NODE_MAJOR).toBe(18);
  });

  it('is at least as strict as the Node version Next.js requires', () => {
    const nextRange = (
      JSON.parse(readRepoFile('node_modules/next/package.json')) as { engines: { node: string } }
    ).engines.node;
    const nextMin = parseMinimum(nextRange);
    const ourMin = parseMinimum(range);
    expect(nextMin && ourMin && compareVersions(ourMin, nextMin)).toBeGreaterThanOrEqual(0);
  });

  it('enforces engines, then pnpm-only, on install via .npmrc and the preinstall hook', () => {
    expect(readRepoFile('.npmrc')).toMatch(/^engine-strict=true$/m);
    expect(pkg.scripts?.preinstall).toBe(
      'node ./scripts/check-node-engine.mjs && node ./scripts/check-package-manager.mjs',
    );
  });

  it('rejects installs from any package manager but pnpm', () => {
    expect(checkPackageManager('pnpm/9.15.9 npm/? node/v22.0.0 linux x64')).toBeNull();
    expect(checkPackageManager('npm/10.8.2 node/v22.0.0 linux x64')).toMatch(/^PACKAGE_MANAGER_UNSUPPORTED:/);
    expect(checkPackageManager('yarn/1.22.22 npm/? node/v22.0.0')).toMatch(/^PACKAGE_MANAGER_UNSUPPORTED:/);
    expect(checkPackageManager(undefined)).toMatch(/^PACKAGE_MANAGER_UNSUPPORTED:/);
  });

  it('pins .nvmrc and every CI setup-node to a version that satisfies engines', () => {
    const pins = [
      readRepoFile('.nvmrc').trim(),
      ...[...readRepoFile('.github/workflows/ci.yml').matchAll(/node-version:\s*"?([\d.]+)"?/g)].map(
        ([, version]) => version,
      ),
    ];
    expect(pins.length).toBeGreaterThan(1);
    for (const pin of pins) {
      expect(checkNodeEngine(range, pin), `Node pin ${pin}`).toBeNull();
    }
  });

  it('rejects Node versions below the declared floor', () => {
    const [major] = parseMinimum(range) ?? [0];
    expect(checkNodeEngine(range, 'v16.20.2')).toMatch(/^ENGINE_UNSUPPORTED_NODE:/);
    expect(checkNodeEngine(range, `v${major - 1}.99.99`)).toMatch(/^ENGINE_UNSUPPORTED_NODE:/);
    expect(checkNodeEngine(range, process.version)).toBeNull();
  });

  it('fails closed on ranges it cannot verify or that drop below Node 18', () => {
    expect(checkNodeEngine(undefined as unknown as string, 'v22.0.0')).toMatch(/^ENGINE_RANGE_INVALID:/);
    expect(checkNodeEngine('^22', 'v22.0.0')).toMatch(/^ENGINE_RANGE_INVALID:/);
    expect(checkNodeEngine('>=16', 'v22.0.0')).toMatch(/^ENGINE_RANGE_TOO_LOW:/);
    expect(checkNodeEngine('>=20.9.0', 'v20.8.9')).toMatch(/^ENGINE_UNSUPPORTED_NODE:/);
    expect(checkNodeEngine('>=20.9.0', 'garbage')).toMatch(/^ENGINE_UNSUPPORTED_NODE:/);
  });
});

/**
 * Guards for issue #819: CSS output depends only on committed sources and
 * the frozen lockfile, never on local build artifacts or scan order.
 */
describe('Deterministic CSS build', () => {
  it('uses Tailwind as the only PostCSS plugin', async () => {
    const { default: postcssConfig } = (await import('../postcss.config.mjs')) as {
      default: { plugins: Record<string, unknown> };
    };
    expect(Object.keys(postcssConfig.plugins)).toEqual(['@tailwindcss/postcss']);
  });

  it('resolves exactly one tailwindcss and @tailwindcss/postcss version in the lockfile', () => {
    const lockfile = readRepoFile('pnpm-lock.yaml');
    for (const name of ['tailwindcss', "'@tailwindcss/postcss"]) {
      const escaped = name.replace(/[/@']/g, '\\$&');
      const versions = new Set(
        [...lockfile.matchAll(new RegExp(`^  ${escaped}@(\\d[^:(']*)`, 'gm'))].map(([, v]) => v),
      );
      expect([...versions], name).toHaveLength(1);
    }
  });

  it.each(['.next/', 'out/', 'coverage/', 'storybook-static/', 'playwright-report/', 'test-results/'])(
    'git-ignores build output %s so Tailwind source detection never scans it',
    (dir) => {
      const ignored = readRepoFile('.gitignore')
        .split('\n')
        .map((line) => line.trim().replace(/^\//, ''));
      expect(ignored).toContain(dir);
    },
  );

  it('emits byte-identical CSS regardless of class discovery order', async () => {
    const { compile } = await import('tailwindcss');
    const twRoot = resolve(repoRoot, 'node_modules/tailwindcss');
    const loadStylesheet = async (id: string, base: string) => ({
      path: id,
      base,
      content: readFileSync(
        resolve(twRoot, id === 'tailwindcss' ? 'index.css' : `${id.replace(/^tailwindcss\//, '')}`),
        'utf8',
      ),
    });
    const build = async (candidates: string[]) =>
      (await compile('@import "tailwindcss";', { base: twRoot, loadStylesheet })).build(candidates);

    const candidates = ['flex', 'p-4', 'text-red-500', 'md:grid', 'hover:bg-blue-600', 'dark:text-white'];
    const first = await build(candidates);
    const reversed = await build([...candidates].reverse());
    const duplicated = await build([...candidates, ...candidates]);

    expect(first).toContain('.hover\\:bg-blue-600');
    expect(reversed).toBe(first);
    expect(duplicated).toBe(first);
  });
});
