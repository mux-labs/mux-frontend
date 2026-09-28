import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	// Accessibility of interactive elements (issue #845). The jsx-a11y plugin
	// is registered by eslint-config-next; these rules make keyboard/role
	// support for clickable UI an error. The two label rules stay warnings
	// until existing violations are cleaned up.
	{
		files: ["**/*.{jsx,tsx}"],
		rules: {
			"jsx-a11y/click-events-have-key-events": "error",
			"jsx-a11y/mouse-events-have-key-events": "error",
			"jsx-a11y/no-static-element-interactions": "error",
			"jsx-a11y/no-noninteractive-element-interactions": "error",
			"jsx-a11y/interactive-supports-focus": "error",
			"jsx-a11y/no-noninteractive-tabindex": "error",
			"jsx-a11y/no-noninteractive-element-to-interactive-role": "error",
			"jsx-a11y/no-interactive-element-to-noninteractive-role": "error",
			"jsx-a11y/tabindex-no-positive": "error",
			"jsx-a11y/anchor-is-valid": "error",
			"jsx-a11y/no-autofocus": "error",
			"jsx-a11y/control-has-associated-label": "warn",
			"jsx-a11y/label-has-associated-control": "warn",
		},
	},
	// Override default ignores of eslint-config-next.
	globalIgnores([
		// Default ignores of eslint-config-next:
		".next/**",
		"out/**",
		"build/**",
		"next-env.d.ts",
	]),
]);

export default eslintConfig;
