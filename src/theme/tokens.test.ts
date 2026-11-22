import { describe, expect, it } from "vitest";
import { type ThemeName, themeCssVars, themes } from "./tokens";

const THEME_NAMES = Object.keys(themes) as ThemeName[];

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

	it("covers both light and dark themes", () => {
		expect(THEME_NAMES.sort()).toEqual(["dark", "light"]);
	});

	it.each(THEME_NAMES)("%s: emits exactly one CSS var per token", (name) => {
		const vars = themeCssVars(name);
		expect(Object.keys(vars).length).toBe(Object.keys(themes[name]).length);
	});

	it.each(THEME_NAMES)("%s: prefixes every key with --mux-", (name) => {
		for (const key of Object.keys(themeCssVars(name))) {
			expect(key.startsWith("--mux-")).toBe(true);
		}
	});

	it.each(THEME_NAMES)(
		"%s: returned keys are exactly the prefixed token keys",
		(name) => {
			const expected = Object.keys(themes[name]).map((k) => `--mux-${k}`);
			expect(Object.keys(themeCssVars(name)).sort()).toEqual(expected.sort());
		},
	);

	it.each(THEME_NAMES)("%s: maps every token to its value", (name) => {
		const vars = themeCssVars(name);
		const tokens: Record<string, string> = themes[name];
		for (const key of Object.keys(themes.light)) {
			expect(vars[`--mux-${key}`]).toBe(tokens[key]);
		}
	});

	it.each(THEME_NAMES)(
		"%s: returns a fresh record that does not alias themes",
		(name) => {
			const original = themes[name].background;
			const vars = themeCssVars(name);
			vars["--mux-background"] = "#123456";
			delete vars["--mux-foreground"];

			expect(themes[name].background).toBe(original);
			expect(themes[name].foreground).toBeDefined();
			expect(themeCssVars(name)["--mux-background"]).toBe(original);
			expect(themeCssVars(name)).not.toBe(themeCssVars(name));
		},
	);

	it("returns an empty map for an unknown theme name", () => {
		const unknown = "solarized" as ThemeName;
		expect(() => themeCssVars(unknown)).not.toThrow(TypeError);
		expect(themeCssVars(unknown)).toEqual({});
	});

	it("does not resolve inherited object properties as themes", () => {
		for (const name of ["toString", "constructor", "__proto__"]) {
			expect(themeCssVars(name as ThemeName)).toEqual({});
		}
	});
});
