// @vitest-environment node
import { describe, expect, it } from "vitest";
import coverageConfig, { surface } from "../../vitest.coverage.full.config";

type TestConfig = {
	test?: {
		coverage?: { provider?: string; include?: string[]; reporter?: string[] };
	};
};

describe("surface (#1160)", () => {
	it("includes every base path in the result", () => {
		const base = ["src/lib/**", "src/hooks/**", "src/utils/**"];
		const extra = ["src/app/recovery/**", "src/middleware.ts"];
		const result = surface(base, extra);
		for (const p of base) {
			expect(result).toContain(p);
		}
	});

	it("includes every extra path in the result", () => {
		const base = ["src/lib/**"];
		const extra = ["src/app/recovery/**", "src/middleware.ts"];
		const result = surface(base, extra);
		for (const p of extra) {
			expect(result).toContain(p);
		}
	});

	it("deduplicates patterns that appear in both base and extra", () => {
		const base = ["src/lib/**", "src/app/**"];
		const extra = ["src/app/**", "src/app/recovery/**"];
		const result = surface(base, extra);
		expect(result.filter((p) => p === "src/app/**")).toHaveLength(1);
	});

	it("surfaces the paths that the default config omits", () => {
		const omitted = [
			"src/app/recovery/**",
			"src/app/login/**",
			"src/app/transactions-table/**",
			"src/middleware.ts",
			"src/app/api/**",
		];
		const result = surface([], omitted);
		for (const p of omitted) {
			expect(result).toContain(p);
		}
	});

	it("returns an empty array when both inputs are empty", () => {
		expect(surface([], [])).toEqual([]);
	});
});

describe("defineConfig in vitest.coverage.full.config.ts (#1159)", () => {
	const config = coverageConfig as TestConfig;

	it("exports a default config object", () => {
		expect(config).toBeDefined();
		expect(typeof config).toBe("object");
	});

	it("sets the coverage provider to v8", () => {
		expect(config.test?.coverage?.provider).toBe("v8");
	});

	it("includes the extra paths that the default config omits", () => {
		const include = config.test?.coverage?.include ?? [];
		expect(include).toContain("src/app/recovery/**");
		expect(include).toContain("src/app/login/**");
		expect(include).toContain("src/app/transactions-table/**");
		expect(include).toContain("src/middleware.ts");
		expect(include).toContain("src/app/api/**");
	});

	it("sets reporters to text, lcov and html as documented", () => {
		expect(config.test?.coverage?.reporter).toEqual(
			expect.arrayContaining(["text", "lcov", "html"]),
		);
	});
});
