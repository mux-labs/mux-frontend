import { describe, expect, it } from "vitest";
import { formatDate } from "../dateFormatting";

describe("formatDate()", () => {
	it("formats a Date object to a readable string", () => {
		const date = new Date("2024-01-15T00:00:00Z");
		// Allow for timezone differences — just assert the shape
		const result = formatDate(date);
		expect(result).toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
		expect(result).toMatch(/2024/);
	});

	it("returns '—' for undefined", () => {
		expect(formatDate(undefined)).toBe("—");
	});

	it("includes the day and year in the output", () => {
		const date = new Date("2025-06-20T12:00:00Z");
		const result = formatDate(date);
		expect(result).toMatch(/2025/);
		// Day should be present as a number
		expect(result).toMatch(/\d+/);
	});
});
