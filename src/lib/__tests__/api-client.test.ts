/**
 * Regression tests for parseEnvelope in src/lib/api-client.ts (issue #1164).
 *
 * Documented contract: fetch path from the wallet service and normalize the
 * response into an Envelope. Fails closed: a network error or non-JSON body
 * throws rather than returning an optimistic/empty envelope.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseEnvelope } from "../api-client";

const BASE = "https://wallet.example.com";

function mockFetch(response: Partial<Response> & { _json?: unknown }) {
	const { _json, ...rest } = response;
	const res = {
		ok: rest.ok ?? true,
		status: rest.status ?? 200,
		json: _json !== undefined
			? vi.fn().mockResolvedValue(_json)
			: vi.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
		...rest,
	} as unknown as Response;
	vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res));
}

beforeEach(() => {
	vi.stubEnv("WALLET_SERVICE_URL", BASE);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Happy path — ok response
// ---------------------------------------------------------------------------
describe("parseEnvelope — successful upstream response", () => {
	it("returns data from the upstream body and null error on 2xx", async () => {
		mockFetch({ ok: true, status: 200, _json: { id: "w1", balance: "100" } });
		const env = await parseEnvelope("/wallets/w1", "corr-1");
		expect(env.data).toEqual({ id: "w1", balance: "100" });
		expect(env.error).toBeNull();
	});

	it("echoes the correlationId supplied by the caller", async () => {
		mockFetch({ ok: true, _json: {} });
		const env = await parseEnvelope("/wallets/w1", "my-corr-id");
		expect(env.correlationId).toBe("my-corr-id");
	});

	it("sets the x-correlation-id request header", async () => {
		mockFetch({ ok: true, _json: {} });
		await parseEnvelope("/wallets/w1", "trace-abc");
		const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(new Headers(init.headers).get("x-correlation-id")).toBe("trace-abc");
	});

	it("always sends cache: no-store", async () => {
		mockFetch({ ok: true, _json: {} });
		await parseEnvelope("/wallets/w1", "c");
		const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(init.cache).toBe("no-store");
	});
});

// ---------------------------------------------------------------------------
// Error path — non-ok upstream response
// ---------------------------------------------------------------------------
describe("parseEnvelope — upstream error response", () => {
	it("returns null data and an error envelope on a 4xx response", async () => {
		mockFetch({
			ok: false,
			status: 404,
			_json: { code: "WALLET_NOT_FOUND", message: "No such wallet." },
		});
		const env = await parseEnvelope("/wallets/missing", "corr-2");
		expect(env.data).toBeNull();
		expect(env.error?.code).toBe("WALLET_NOT_FOUND");
		expect(env.error?.message).toBe("No such wallet.");
		expect(env.status).toBe(404);
	});

	it("falls back to UPSTREAM_ERROR code when the body has none", async () => {
		mockFetch({ ok: false, status: 500, _json: {} });
		const env = await parseEnvelope("/wallets/x", "corr-3");
		expect(env.error?.code).toBe("UPSTREAM_ERROR");
	});

	it("falls back to a generic message when the body has none", async () => {
		mockFetch({ ok: false, status: 503, _json: null });
		const env = await parseEnvelope("/wallets/x", "corr-4");
		expect(typeof env.error?.message).toBe("string");
		expect(env.error?.message.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Fail-closed: network error or non-JSON body must throw, never return empty
// ---------------------------------------------------------------------------
describe("parseEnvelope — fails closed on bad responses", () => {
	it("throws on a network error (fetch rejects)", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
		);
		await expect(parseEnvelope("/wallets/w1", "corr-5")).rejects.toThrow(
			"Failed to fetch",
		);
	});

	it("throws when the upstream body is not valid JSON", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: vi
					.fn()
					.mockRejectedValue(
						new SyntaxError("Unexpected token < in JSON at position 0"),
					),
			}),
		);
		await expect(parseEnvelope("/wallets/w1", "corr-6")).rejects.toThrow(
			SyntaxError,
		);
	});
});
