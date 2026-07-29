import { validateEnv } from "./src/lib/env";

// Validate environment variables at build/startup time
validateEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
	/**
	 * Compress responses with gzip / brotli.
	 * Reduces transfer size for the analytics bundle and other large pages.
	 */
	compress: true,

	/**
	 * Keep production source maps off to minimise served JS size.
	 */
	productionBrowserSourceMaps: false,

	/**
	 * Enable granular code-splitting for large client bundles (Next 13+).
	 * This tells the router to prepare client chunks incrementally rather
	 * than all at once, which helps the analytics page load faster.
	 */
	experimental: {
		optimizePackageImports: [
			"@/components/analytics",
			"@/components/dashboard",
		],
	},
};

export default nextConfig;
