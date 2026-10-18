'use server';

export interface BiomeEslintConfig {
  extends?: string[];
  rules?: Record<string, 'on' | 'off' | 'warn' | 'error'>;
  overrides?: Array<{
    files: string[];
    rules?: Record<string, 'on' | 'off' | 'warn' | 'error'>;
  }>;
}

export function createBiomeConfig(config: BiomeEslintConfig): object {
  return {
    ...config,
    files: {
      includes: ['**/*.{ts,tsx,js,jsx}'],
      excludes: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    },
    linter: {
      enabled: true,
      rules: {
        ...(config.rules || {}),
        complexity: 'off',
        'no-unused-vars': 'error',
        'no-var': 'error',
        'prefer-const': 'error',
        'require-await': 'error',
      },
    },
    formatter: {
      enabled: true,
      indentWidth: 2,
      lineEnding: 'lf',
    },
    javascript: {
      formatter: {
        quoteStyle: 'single',
        trailingComma: 'all',
      },
    },
  };
}

export function alignEslintToBiome(eslintConfig: Record<string, unknown>): Record<string, unknown> {
  const aligned = { ...eslintConfig };
  const ruleMap: Record<string, string> = {
    'no-unused-vars': 'no-unused-vars',
    'no-var': 'no-var',
    'prefer-const': 'prefer-const',
    'eqeqeq': 'eqeqeq',
    'curly': 'curly',
    'no-console': 'no-console',
    'no-alert': 'no-alert',
  };

  if (aligned.rules && typeof aligned.rules === 'object') {
    const rules = aligned.rules as Record<string, unknown>;
    for (const [rule] of Object.entries(ruleMap)) {
      if (!(rule in rules)) {
        (rules as Record<string, unknown>)[rule] = 'error';
      }
    }
  }

  return aligned;
}
