import { describe, expect, it } from "vitest";

import {
	CORRELATION_HEADER,
	isValidCorrelationId,
	readCorrelationId,
} from "./correlation";

describe("isValidCorrelationId", () => {
	it("accepts conservative opaque ids", () => {
		expect(isValidCorrelationId("abc123")).toBe(true);
		expect(isValidCorrelationId("550e8400-e29b-41d4-a716-446655440000")).toBe(
			true,
		);
		expect(isValidCorrelationId("req_01:abc.def-ghi")).toBe(true);
		expect(isValidCorrelationId("a")).toBe(true);
		expect(isValidCorrelationId("a".repeat(128))).toBe(true);
	});

	it("rejects non-string values", () => {
		expect(isValidCorrelationId(undefined)).toBe(false);
		expect(isValidCorrelationId(null)).toBe(false);
		expect(isValidCorrelationId(123)).toBe(false);
		expect(isValidCorrelationId({})).toBe(false);
	});

	it("rejects empty and whitespace-only ids", () => {
		expect(isValidCorrelationId("")).toBe(false);
		expect(isValidCorrelationId("   ")).toBe(false);
	});

	it("rejects ids containing markup", () => {
		expect(isValidCorrelationId("<script>alert(1)</script>")).toBe(false);
		expect(isValidCorrelationId("abc<img src=x>")).toBe(false);
		expect(isValidCorrelationId('abc"onmouseover="x')).toBe(false);
	});

	it("rejects ids containing log-forging newlines", () => {
		expect(isValidCorrelationId("abc\ndef")).toBe(false);
		expect(isValidCorrelationId("abc\rdef")).toBe(false);
		expect(isValidCorrelationId("abc\r\ndef")).toBe(false);
	});

	it("rejects oversized ids", () => {
		expect(isValidCorrelationId("a".repeat(129))).toBe(false);
		expect(isValidCorrelationId("a".repeat(1024))).toBe(false);
	});

	it("rejects ids with disallowed characters", () => {
		expect(isValidCorrelationId("abc def")).toBe(false);
		expect(isValidCorrelationId("abc/def")).toBe(false);
		expect(isValidCorrelationId("abc;def")).toBe(false);
	});
});

describe("readCorrelationId", () => {
	function headers(init: Record<string, string> = {}): Headers {
		return new Headers(init);
	}

	it("reads the correlation id from the correlation header", () => {
		expect(
			readCorrelationId(headers({ [CORRELATION_HEADER]: "abc-123" })),
		).toBe("abc-123");
	});

	it("falls back to the x-request-id header", () => {
		expect(readCorrelationId(headers({ "x-request-id": "req_42" }))).toBe(
			"req_42",
		);
	});

	it("prefers the correlation header over x-request-id", () => {
		expect(
			readCorrelationId(
				headers({
					[CORRELATION_HEADER]: "primary-id",
					"x-request-id": "fallback-id",
				}),
			),
		).toBe("primary-id");
	});

	it("returns null when no correlation header is present", () => {
		expect(readCorrelationId(headers())).toBeNull();
	});

	it("returns null for unsafe values", () => {
		const unsafe = [
			"",
			"   ",
			"has space",
			"line\nbreak",
			"<script>alert(1)</script>",
			"a".repeat(129),
			"---",
		];
		for (const value of unsafe) {
			expect(
				readCorrelationId(headers({ [CORRELATION_HEADER]: value })),
			).toBeNull();
		}
	});

	it("returns null when only the fallback header is unsafe", () => {
		expect(
			readCorrelationId(headers({ "x-request-id": "bad value" })),
		).toBeNull();
	});

	it("accepts ids at the length boundary", () => {
		const value = "a".repeat(128);
		expect(readCorrelationId(headers({ [CORRELATION_HEADER]: value }))).toBe(
			value,
		);
	});
});
