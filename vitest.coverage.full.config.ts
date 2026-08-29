import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Extended coverage config for the gap described in the "Expand Vitest
 * coverage" roadmap item: the default `vitest.config.ts` coverage.include
 * list omits `/recovery`, `/login`, `/transactions-table`, `src/middleware.ts`,
 * and most `src/app/api/**` routes, even though tests already exist for all
 * of them (see `src/app/recovery/__tests__`, `src/app/login/__tests__`,
 * `src/app/transactions-table/page.test.tsx`, `src/test/middleware.test.ts`,
 * `src/__tests__/middleware.test.ts`, and `src/app/api/**\/*.test.ts`) — they
 * just don't count toward the reported coverage numbers.
 *
 * This is an additive, standalone config (kept separate from
 * `vitest.config.ts` on purpose) so it can be run on demand without changing
 * the default `pnpm test` coverage surface:
 *
 *   pnpm exec vitest run --config vitest.coverage.full.config.ts --coverage
 *
 * See docs/vitest-coverage-expansion.md.
 */
export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./src/test/setup.tsx"],
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov", "html"],
			include: [
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
				"src/app/recovery/**",
				"src/app/login/**",
				"src/app/transactions-table/**",
				"src/middleware.ts",
				"src/app/api/**",
			],
			exclude: ["src/test/**", "**/*.d.ts"],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
