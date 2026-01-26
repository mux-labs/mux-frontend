import type { NextConfig } from "next";

const nextConfig = {
	experimental: {
		turbo: {
			rules: {
				"*.css": {
					loaders: ["@tailwindcss/vite"],
				},
			},
		},
	},
};

export default nextConfig;
