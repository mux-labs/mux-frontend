import "@testing-library/jest-dom";
import { afterEach, beforeEach, vi } from "vitest";

/**
 * Global test setup for the Mux frontend suite.
 *
 * The API client envelope parsing tests (#780) rely on a deterministic
 * fetch implementation so that envelope unwrapping, stable error codes,
 * correlation id propagation, auth negatives, and adversarial/malformed
 * payloads can be asserted without hitting the network. We install a
 * fail-closed fetch stub here and reset it between tests so no test can
 * silently succeed against an unexpected request.
 */

const originalFetch = globalThis.fetch;

beforeEach(() => {
  // Fail-closed default: any un-stubbed network call rejects loudly instead
  // of resolving with an empty/undefined body that could mask a bug.
  globalThis.fetch = vi.fn(() =>
    Promise.reject(
      new Error(
        "Unexpected fetch call in test. Stub globalThis.fetch for the request under test.",
      ),
    ),
  ) as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  globalThis.fetch = originalFetch;
});
