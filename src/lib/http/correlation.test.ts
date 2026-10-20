import { describe, expect, it } from "vitest";
import {
	CORRELATION_HEADER,
	isValidCorrelationId,
	readCorrelationId,
	resolveCorrelationId,
} from "./correlation";

describe("correlation ids", () => {
	it("accepts and echoes a valid UUID", () => {
		const id = crypto.randomUUID();
		expect(isValidCorrelationId(id)).toBe(true);
		expect(readCorrelationId(new Headers({ [CORRELATION_HEADER]: id }))).toBe(
			id,
		);
		expect(resolveCorrelationId(new Headers({ [CORRELATION_HEADER]: id }))).toBe(
			id,
		);
	});

	it("uses x-request-id when x-correlation-id is absent", () => {
		const id = "request-123";
		expect(readCorrelationId(new Headers({ "x-request-id": id }))).toBe(id);
	});

	it.each([
		["a newline", "request\nforged"],
		["129 characters", "a".repeat(129)],
		["colon separators only", "::::"],
		["hyphen separators only", "----"],
		["128 separators", ".".repeat(128)],
	])("rejects %s", (_description, value) => {
		expect(isValidCorrelationId(value)).toBe(false);
	});

	it.each([
		["absent", new Headers()],
		["invalid", new Headers({ [CORRELATION_HEADER]: "::::" })],
	])("mints a UUID when inbound headers are %s", (_description, headers) => {
		const id = resolveCorrelationId(headers);
		expect(isValidCorrelationId(id)).toBe(true);
		expect(id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
		);
	});
});
