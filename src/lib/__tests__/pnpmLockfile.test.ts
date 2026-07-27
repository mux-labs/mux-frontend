import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");

describe("package manager lockfile policy", () => {
	it("tracks pnpm-lock.yaml", () => {
		expect(existsSync(resolve(root, "pnpm-lock.yaml"))).toBe(true);
	});

	it("does not track competing lockfiles", () => {
		expect(existsSync(resolve(root, "package-lock.json"))).toBe(false);
		expect(existsSync(resolve(root, "yarn.lock"))).toBe(false);
		expect(existsSync(resolve(root, "npm-shrinkwrap.json"))).toBe(false);
	});

	it("declares packageManager in package.json", () => {
		const pkg = JSON.parse(
			readFileSync(resolve(root, "package.json"), "utf-8"),
		);
		expect(pkg.packageManager).toMatch(/^pnpm@/);
	});
});
