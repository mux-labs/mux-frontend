import type { Preview } from "@storybook/react";
import "../src/app/globals.css";
import { themes } from "../src/theme/tokens";

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		layout: "centered",
		backgrounds: {
			default: "light",
			values: [
				{ name: "light", value: themes.light.background },
				{ name: "dark", value: themes.dark.background },
			],
		},
	},
};

export default preview;
