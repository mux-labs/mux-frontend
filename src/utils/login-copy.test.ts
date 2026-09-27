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
});
