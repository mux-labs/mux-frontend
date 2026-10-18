import { describe, expect, it } from 'vitest';
import { alignEslintToBiome, createBiomeConfig } from './biome-eslint';

describe('createBiomeConfig', () => {
  it('includes the fixed rule set even when the caller passes conflicting values', () => {
    const result = createBiomeConfig({
      rules: {
        complexity: 'warn',
        'no-unused-vars': 'off',
        'no-var': 'off',
      },
    }) as { linter: { rules: Record<string, string> } };

    expect(result.linter.rules.complexity).toBe('off');
    expect(result.linter.rules['no-unused-vars']).toBe('error');
    expect(result.linter.rules['no-var']).toBe('error');
    expect(result.linter.rules['prefer-const']).toBe('error');
    expect(result.linter.rules['require-await']).toBe('error');
  });

  it('keeps caller-supplied rules that do not conflict with the fixed set', () => {
    const result = createBiomeConfig({
      rules: { eqeqeq: 'error' },
    }) as { linter: { rules: Record<string, string> } };

    expect(result.linter.rules.eqeqeq).toBe('error');
  });

  it('matches the documented files.includes/excludes defaults', () => {
    const result = createBiomeConfig({}) as {
      files: { includes: string[]; excludes: string[] };
    };

    expect(result.files.includes).toEqual(['**/*.{ts,tsx,js,jsx}']);
    expect(result.files.excludes).toEqual([
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
    ]);
  });

  it('matches the documented formatter defaults', () => {
    const result = createBiomeConfig({}) as {
      formatter: { indentWidth: number; lineEnding: string };
    };

    expect(result.formatter.indentWidth).toBe(2);
    expect(result.formatter.lineEnding).toBe('lf');
  });
});

describe('alignEslintToBiome', () => {
  it('adds every missing ruleMap key as "error"', () => {
    const aligned = alignEslintToBiome({ rules: {} }) as {
      rules: Record<string, string>;
    };

    expect(aligned.rules['no-unused-vars']).toBe('error');
    expect(aligned.rules['no-var']).toBe('error');
    expect(aligned.rules['prefer-const']).toBe('error');
    expect(aligned.rules.eqeqeq).toBe('error');
    expect(aligned.rules.curly).toBe('error');
    expect(aligned.rules['no-console']).toBe('error');
    expect(aligned.rules['no-alert']).toBe('error');
  });

  it('does not overwrite an existing rule, including one set to "off"', () => {
    const aligned = alignEslintToBiome({
      rules: { 'no-var': 'off', eqeqeq: 'warn' },
    }) as { rules: Record<string, string> };

    expect(aligned.rules['no-var']).toBe('off');
    expect(aligned.rules.eqeqeq).toBe('warn');
    // Untouched keys are still filled in.
    expect(aligned.rules.curly).toBe('error');
  });

  it('leaves the input object unmutated and returns a copy', () => {
    const input = { rules: { 'no-var': 'off' } };
    const aligned = alignEslintToBiome(input) as { rules: Record<string, string> };

    expect(aligned).not.toBe(input);
    expect(input.rules).toEqual({ 'no-var': 'off' });
  });
});
