import { describe, expect, it } from "vitest";
import config from "./playwright.config";

/**
 * Regression tests for the `defineConfig` export in `playwright.config.ts`.
 *
 * The config is documented as: Playwright configuration for Mux Dashboard
 * end-to-end tests. Specs live in `tests/e2e/` and exercise the primary user
 * paths against a locally running dev server. The mock `/api/auth/login` and
 * `/api/wallets` routes accept any well-formed request when
 * `NEXT_PUBLIC_API_URL` is unset.
 */
describe("playwright.config defineConfig", () => {
	it("points e2e specs at tests/e2e/", () => {
		expect(config.testDir).toBe("tests/e2e");
	});

	it("targets a locally running dev server", () => {
		const baseURL = config.use?.baseURL;
		expect(typeof baseURL).toBe("string");
		expect(baseURL).toMatch(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/);
	});

	it("starts the dev server via webServer", () => {
		const webServer = config.webServer;
		expect(webServer).toBeDefined();
		const servers = Array.isArray(webServer) ? webServer : [webServer];
		expect(servers.length).toBeGreaterThan(0);
		const command = servers[0]?.command ?? "";
		expect(command).toMatch(/dev/);
	});

	it("defines the smoke and full projects", () => {
		const names = (config.projects ?? []).map((project) => project.name);
		expect(names).toContain("smoke");
		expect(names).toContain("full");
	});
});
