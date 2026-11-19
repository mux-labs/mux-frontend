import { afterEach, describe, expect, it } from "vitest";
import { isMockFallbackAllowedFor } from "./route";

/**
 * Regression tests for the mock-fallback gate (issue #1133).
 *
 * The predicate must only allow the mock fixture when no backend is
 * configured AND the environment explicitly names a known non-production
 * network. These tests fail if that behavior is dropped or weakened.
 */
describe("isMockFallbackAllowedFor", () => {
	const originalEnv = { ...process.env };

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it("allows the mock fixture when no backend is configured and a known non-production network is named", () => {
		expect(
			isMockFallbackAllowedFor({
				NEXT_PUBLIC_NETWORK: "testnet",
			}),
		).toBe(true);
	});

	it("denies the mock fixture when a backend is configured", () => {
		expect(
			isMockFallbackAllowedFor({
				NEXT_PUBLIC_NETWORK: "testnet",
				NEXT_PUBLIC_BACKEND_URL: "https://api.example.com",
			}),
		).toBe(false);
	});

	it("denies the mock fixture when the environment is not explicitly named", () => {
		expect(isMockFallbackAllowedFor({})).toBe(false);
	});

	it("denies the mock fixture for an unknown network", () => {
		expect(
			isMockFallbackAllowedFor({
				NEXT_PUBLIC_NETWORK: "some-unknown-network",
			}),
		).toBe(false);
	});

	it("denies the mock fixture in production", () => {
		expect(
			isMockFallbackAllowedFor({
				NEXT_PUBLIC_NETWORK: "mainnet",
			}),
		).toBe(false);
	});
});
