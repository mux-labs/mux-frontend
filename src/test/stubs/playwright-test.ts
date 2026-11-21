/**
 * Minimal stub for @playwright/test used in Vitest unit tests.
 *
 * Playwright itself runs under `playwright test`, not Vitest. Files that
 * export testable helpers alongside a Playwright config (e.g.
 * assertRealBackendConfigured) need this stub so Vitest can import them
 * without @playwright/test being installed in the test environment.
 */
export const defineConfig = (config: unknown) => config;
export const devices: Record<string, unknown> = new Proxy(
	{},
	{ get: () => ({}) },
);
