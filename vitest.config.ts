import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

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
