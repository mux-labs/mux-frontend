/**
 * Design theme tokens shared by the app and Storybook so stories render with
 * the same palette as production. Change values here, not in individual stories.
 */

export const themes = {
	light: {
		background: "#ffffff",
		foreground: "#09090b",
		muted: "#71717a",
		border: "#e4e4e7",
		primary: "#2563eb",
		danger: "#dc2626",
	},
	dark: {
		background: "#09090b",
		foreground: "#fafafa",
		muted: "#a1a1aa",
		border: "#27272a",
		primary: "#3b82f6",
		danger: "#ef4444",
	},
} as const;

export type ThemeName = keyof typeof themes;
export type ThemeTokens = { [K in keyof (typeof themes)["light"]]: string };

/** Maps tokens to CSS custom properties, e.g. `--mux-background`. */
export function themeCssVars(name: ThemeName): Record<string, string> {
	const vars: Record<string, string> = {};
	for (const [key, value] of Object.entries(themes[name]))
		vars[`--mux-${key}`] = value;
	return vars;
}
