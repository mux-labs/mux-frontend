import { describe, expect, it } from "vitest";
import {
	getLoginErrorMessage,
	LOGIN_GENERIC_ERROR,
	LOGIN_RATE_LIMITED_ERROR,
	LOGIN_UNAVAILABLE_ERROR,
} from "./login-copy";

describe("getLoginErrorMessage", () => {
	it("uses identical copy for unknown account and wrong password", () => {
		for (const status of [400, 401, 403, 404, 423]) {
			expect(getLoginErrorMessage(status)).toBe(LOGIN_GENERIC_ERROR);
		}
	});

	it("maps rate limiting and outages to distinct copy", () => {
		expect(getLoginErrorMessage(429)).toBe(LOGIN_RATE_LIMITED_ERROR);
		expect(getLoginErrorMessage(503)).toBe(LOGIN_UNAVAILABLE_ERROR);
		expect(getLoginErrorMessage(undefined)).toBe(LOGIN_UNAVAILABLE_ERROR);
	});

	it("does not leak account state across unknown, wrong password, locked and unverified", () => {
		const unknownEmail = getLoginErrorMessage(404);
		const wrongPassword = getLoginErrorMessage(401);
		const locked = getLoginErrorMessage(423);
		const unverified = getLoginErrorMessage(403);

		expect(unknownEmail).toBe(LOGIN_GENERIC_ERROR);
		expect(wrongPassword).toBe(unknownEmail);
		expect(locked).toBe(unknownEmail);
		expect(unverified).toBe(unknownEmail);
	});

	it("keeps transport and availability failures distinct from the generic message", () => {
		const generic = getLoginErrorMessage(401);

		expect(getLoginErrorMessage(429)).not.toBe(generic);
		expect(getLoginErrorMessage(500)).not.toBe(generic);
		expect(getLoginErrorMessage(502)).not.toBe(generic);
		expect(getLoginErrorMessage(undefined)).not.toBe(generic);
		expect(getLoginErrorMessage(429)).not.toBe(getLoginErrorMessage(503));
	});
});
