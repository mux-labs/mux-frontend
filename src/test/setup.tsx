/**
 * Vitest jsdom setup — canonical entry point for both vitest.config.ts and
 * vitest.coverage.full.config.ts (issue #811).
 *
 * Re-exports the root vitest.setup.ts so there is a single source of truth
 * for the global fetch stub and jest-dom matchers. Keeping this file in
 * src/test/ satisfies the setupFiles path both configs declare while the
 * actual setup logic stays in one place.
 */
export * from "../../vitest.setup";
