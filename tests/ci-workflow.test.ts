import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression guard for #651: CI previously ran typecheck, Vitest and build
 * only, so the Playwright e2e smoke suite documented in the README never
 * executed on a PR. These assertions fail if the e2e job is removed again.
 */
const ciWorkflow = readFileSync(
	join(process.cwd(), ".github/workflows/ci.yml"),
	"utf8",
);

describe("CI workflow", () => {
	it("runs the Playwright e2e smoke tests", () => {
		expect(ciWorkflow).toMatch(/pnpm run test:e2e/);
	});

	it("installs a Playwright browser before running the e2e job", () => {
		expect(ciWorkflow).toMatch(/playwright install .*chromium/i);
	});

	it("defines a dedicated e2e job", () => {
		expect(ciWorkflow).toMatch(/^\s{2}e2e-tests:/m);
	});
});
