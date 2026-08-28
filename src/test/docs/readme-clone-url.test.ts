/**
 * Tests for #635: the README clone URL must point at the same GitHub org
 * ("mux-labs") as the LICENSE copyright holder. The mismatched
 * `github.com/muxlabs/...` URL sends contributors to a repo that does not
 * exist.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "..", "..", "..");
const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
const license = readFileSync(join(repoRoot, "LICENSE"), "utf8");

describe("README clone URL", () => {
	it("uses the same GitHub org as the LICENSE copyright holder", () => {
		const licenseOrg = license.match(/Copyright \(c\) \d{4} (\S+)/)?.[1];
		expect(licenseOrg).toBe("mux-labs");

		const cloneUrl = readme.match(/git clone (\S+)/)?.[1];
		expect(cloneUrl).toBe(`https://github.com/${licenseOrg}/mux-frontend.git`);
	});

	it("has no lingering github.com/muxlabs references", () => {
		expect(readme).not.toMatch(/github\.com\/muxlabs\b/);
	});
});
