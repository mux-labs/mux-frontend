import { describe, expect, it } from "vitest";
import { formatAbsoluteTime, formatRelativeTime } from "./relativeTime";

describe("formatRelativeTime", () => {
	it("returns 'just now' for timestamps within the last few seconds", () => {
		expect(formatRelativeTime(new Date())).toBe("just now");
	});

	it("formats minutes ago", () => {
		const date = new Date(Date.now() - 5 * 60 * 1000);
		expect(formatRelativeTime(date)).toBe("5m ago");
	});

	it("formats hours ago", () => {
		const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
		expect(formatRelativeTime(date)).toBe("3h ago");
	});

	it("formats days ago", () => {
		const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
		expect(formatRelativeTime(date)).toBe("2d ago");
	});
});

describe("formatAbsoluteTime", () => {
	it("returns an ISO-based absolute string usable as a tooltip title", () => {
		const result = formatAbsoluteTime("2024-01-01T00:00:00.000Z");
		expect(result).toBe("2024-01-01 00:00:00.000 UTC");
	});
});
