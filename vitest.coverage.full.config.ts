import path from "path";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

/**
 * Extended coverage config for the gap described in the "Expand Vitest
 * coverage" roadmap item: the default `vitest.config.ts` coverage.include
 * list omits `/recovery`, `/login`, `/transactions-table`, `src/middleware.ts`,
 * and most `src/app/api/**` routes, even though tests already exist for all
 * of them (see `src/app/recovery/__tests__`, `src/app/login/__tests__`,
 * `src/app/transactions-table/page.test.tsx`, `src/test/middleware.test.ts`,
 * `src/__tests__/middleware.test.ts`, and `src/app/api` route test files) —
 * they just don't count toward the reported coverage numbers.
 *
 * This is an additive, standalone config (kept separate from
 * `vitest.config.ts` on purpose) so it can be run on demand without changing
 * the default `pnpm test` coverage surface:
 *
 *   pnpm exec vitest run --config vitest.coverage.full.config.ts --coverage
 *
 * See docs/vitest-coverage-expansion.md.
 */

/**
 * surface merges the default coverage include paths with the additional paths
 * that the default config omits.
 *
 * coverage: { provider: "v8", reporter: ["text", "lcov", "html"],
 * include: [ "src/components/wallet/", "src/components/analytics/",
 * "src/components/ui/", "src/components/transactions/", "src/lib/",
 * "src/utils/", "src/hooks/", "src/mock-data/", "src/services/**",
 * "src/app/
 *
 * Returns a deduplicated array of glob patterns (insertion order preserved)
 * so the caller can verify every path is present.
 *
 * Exported for regression testing (issue #1160).
 *
 * @param base  - the include patterns from the default config
 * @param extra - additional patterns to surface for full coverage
 * @returns deduplicated union of base and extra (base order preserved)
 */
export function surface(base: string[], extra: string[]): string[] {
	return [...new Set([...base, ...extra])];
}

const BASE_INCLUDE = [
	"src/components/wallet/**",
	"src/components/analytics/**",
	"src/components/ui/**",
	"src/components/transactions/**",
	"src/lib/**",
	"src/utils/**",
	"src/hooks/**",
	"src/mock-data/**",
	"src/services/**",
	"src/app/**/wallets/**",
	"src/app/**/analytics/**",
];

const EXTRA_INCLUDE = [
	"src/app/recovery/**",
	"src/app/login/**",
	"src/app/transactions-table/**",
	"src/middleware.ts",
	"src/app/api/**",
];

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./vitest.setup.ts"],
		// Playwright specs run under `playwright test`, not Vitest.
		exclude: [...configDefaults.exclude, "tests/e2e/**/*.spec.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov", "html"],
			include: surface(BASE_INCLUDE, EXTRA_INCLUDE),
			exclude: ["src/test/**", "**/*.d.ts"],
			thresholds: {
				// Fail-closed coverage gate for the critical-path modules this
				// config was added to surface (api-client, api routes, session,
				// middleware). Kept conservative so the existing suite passes
				// today while still preventing silent coverage regressions.
				lines: 60,
				functions: 60,
				branches: 50,
				statements: 60,
			},
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
