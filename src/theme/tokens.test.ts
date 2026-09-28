import { describe, expect, it } from "vitest";
import { themeCssVars, themes } from "./tokens";

describe("theme tokens", () => {
	it("light and dark themes define the same keys", () => {
		expect(Object.keys(themes.dark).sort()).toEqual(
			Object.keys(themes.light).sort(),
		);
	});

	it("maps tokens to CSS custom properties", () => {
		expect(themeCssVars("dark")["--mux-background"]).toBe(
			themes.dark.background,
		);
	});
});
