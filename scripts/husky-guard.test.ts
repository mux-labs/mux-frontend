import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HuskyPreCommitGuard } from './husky-guard';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

afterEach(() => {
  vi.mocked(execSync).mockReset();
});

describe('HuskyPreCommitGuard', () => {
  it('runs the vitest command for the test check', async () => {
    const guard = new HuskyPreCommitGuard({ checks: ['test'], failFast: false });
    const [result] = await guard.runGuard();

    expect(execSync).toHaveBeenCalledWith('npx vitest run', expect.anything());
    expect(result.passed).toBe(true);
  });

  it('runs the eslint command for the lint check', async () => {
    const guard = new HuskyPreCommitGuard({ checks: ['lint'], failFast: false });
    await guard.runGuard();

    expect(execSync).toHaveBeenCalledWith(
      'npx eslint --max-warnings 0',
      expect.anything(),
    );
  });

  it('runs the tsc command for the typecheck check', async () => {
    const guard = new HuskyPreCommitGuard({ checks: ['typecheck'], failFast: false });
    await guard.runGuard();

    expect(execSync).toHaveBeenCalledWith('npx tsc --noEmit', expect.anything());
  });

  it('fails closed on an unknown check without invoking execSync', async () => {
    const guard = new HuskyPreCommitGuard({
      checks: ['some-unknown-check'],
      failFast: false,
    });
    const [result] = await guard.runGuard();

    expect(execSync).not.toHaveBeenCalled();
    expect(result.passed).toBe(false);
    expect(result.errors[0]).toContain('Unsupported pre-commit check');
  });

  it('never shells out to jest or audit-ci, which are not repo dependencies', () => {
    const source = readFileSync(new URL('./husky-guard.ts', import.meta.url), 'utf8');

    expect(source).not.toContain('jest');
    expect(source).not.toContain('audit-ci');
  });
});
