import { afterEach, describe, expect, it, vi } from "vitest";
import {
	CORRELATION_HEADER,
	isValidCorrelationId,
	resolveCorrelationId,
} from "../src/lib/http/correlation";

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function headers(init: Record<string, string> = {}): Headers {
	return new Headers(init);
}

describe("resolveCorrelationId", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("echoes a safe inbound correlation id", () => {
		const inbound = "req-abc_123.4:5";
		expect(resolveCorrelationId(headers({ [CORRELATION_HEADER]: inbound }))).toBe(
			inbound,
		);
	});

	it("echoes a safe inbound x-request-id fallback", () => {
		const inbound = "upstream-request-42";
		expect(resolveCorrelationId(headers({ "x-request-id": inbound }))).toBe(
			inbound,
		);
	});

	it("prefers the correlation header over x-request-id", () => {
		const result = resolveCorrelationId(
			headers({
				[CORRELATION_HEADER]: "primary-id",
				"x-request-id": "fallback-id",
			}),
		);
		expect(result).toBe("primary-id");
	});

	it("mints a fresh id when no inbound id is present", () => {
		const result = resolveCorrelationId(headers());
		expect(result).toMatch(UUID_RE);
		expect(isValidCorrelationId(result)).toBe(true);
	});

	it("mints a fresh id when the inbound id is unsafe", () => {
		const unsafe = [
			"bad\nnewline",
			"<script>alert(1)</script>",
			"has space",
			"",
			"a".repeat(129),
		];
		for (const value of unsafe) {
			const result = resolveCorrelationId(headers({ [CORRELATION_HEADER]: value }));
			expect(result).not.toBe(value);
			expect(result).toMatch(UUID_RE);
		}
	});

	it("mints a fresh id when the inbound id is only punctuation", () => {
		const result = resolveCorrelationId(headers({ [CORRELATION_HEADER]: "---" }));
		expect(result).toMatch(UUID_RE);
	});

	it("mints a fresh id when crypto.randomUUID fails", () => {
		vi.spyOn(crypto, "randomUUID").mockImplementation(() => {
			throw new Error("randomUUID unavailable");
		});
		expect(() => resolveCorrelationId(headers())).toThrow(
			"randomUUID unavailable",
		);
	});
});
