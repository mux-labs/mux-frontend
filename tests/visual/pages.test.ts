import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { PAGES } from "./pages";

describe("visual regression PAGES", () => {
	it("has a non-empty unique name and a path starting with / for every entry", () => {
		expect(PAGES.length).toBeGreaterThan(0);

		const names = new Set<string>();
		for (const { name, path } of PAGES) {
			expect(typeof name).toBe("string");
			expect(name.trim().length).toBeGreaterThan(0);
			expect(names.has(name)).toBe(false);
			names.add(name);

			expect(typeof path).toBe("string");
			expect(path.startsWith("/")).toBe(true);
		}
	});

	it("keeps the strict screenshot comparison options in the spec", () => {
		const specPath = fileURLToPath(new URL("./pages.visual.ts", import.meta.url));
		const source = readFileSync(specPath, "utf8");

		expect(source).toContain('animations: "disabled"');

		const match = source.match(/maxDiffPixelRatio:\s*([0-9.]+)/);
		expect(match).not.toBeNull();
		const ratio = Number(match?.[1]);
		expect(Number.isFinite(ratio)).toBe(true);
		expect(ratio).toBeLessThanOrEqual(0.01);
	});
});
