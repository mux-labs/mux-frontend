import { afterEach, describe, expect, it } from "vitest";
import { resolveConfiguredNetwork } from "@/lib/api-client";

afterEach(() => {
	delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
});

describe("resolveConfiguredNetwork", () => {
	it("returns undefined network with status 200 when env var is absent", () => {
		delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
		const result = resolveConfiguredNetwork();
		expect(result.network).toBeUndefined();
		expect(result.status).toBe(200);
	});

	it("returns mainnet with status 200 when env var is mainnet", () => {
		process.env.NEXT_PUBLIC_STELLAR_NETWORK = "mainnet";
		const result = resolveConfiguredNetwork();
		expect(result.network).toBe("mainnet");
		expect(result.status).toBe(200);
	});

	it("returns testnet with status 200 when env var is testnet", () => {
		process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
		const result = resolveConfiguredNetwork();
		expect(result.network).toBe("testnet");
		expect(result.status).toBe(200);
	});

	it("returns undefined network for an unrecognised value", () => {
		process.env.NEXT_PUBLIC_STELLAR_NETWORK = "devnet";
		const result = resolveConfiguredNetwork();
		// Unrecognised values must not silently become a valid network — the
		// caller is responsible for failing closed when network is undefined.
		expect(result.network).toBeUndefined();
	});

	it("always returns a numeric status so the caller can preserve it in an error envelope", () => {
		const result = resolveConfiguredNetwork();
		expect(typeof result.status).toBe("number");
	});
});
