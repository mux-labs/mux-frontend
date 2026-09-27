import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = join(process.cwd(), "public");

describe("favicon and apple icons", () => {
	it.each(["favicon.svg", "apple-touch-icon.png", "site.webmanifest"])(
		"%s is present",
		(file) => {
			expect(existsSync(join(publicDir, file))).toBe(true);
		},
	);

	it("web manifest declares icons", () => {
		const manifest = JSON.parse(
			readFileSync(join(publicDir, "site.webmanifest"), "utf8"),
		);
		expect(manifest.icons.length).toBeGreaterThan(0);
		for (const icon of manifest.icons) {
			expect(existsSync(join(publicDir, icon.src))).toBe(true);
		}
	});
});
