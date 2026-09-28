import { validateEnv } from "./src/lib/env";

// Validate environment variables at build/startup time
validateEnv();

/**
 * Source maps production policy (issue #860):
 *
 * - Production builds MUST NOT ship browser-readable source maps. Serving
 *   `.map` files exposes original TypeScript, internal module paths, and
 *   any inlined constants to anyone with devtools, which is a security and
 *   IP-leak risk on the money path (wallet / AA / payment flows).
 * - Development and test builds keep source maps enabled so contributors
 *   (including Stellar Wave) can debug with real stack traces.
 *
 * The value below is derived from NODE_ENV so the policy is fail-closed:
 * any non-`development`/`test` environment (including `production` and
 * unknown values) resolves to `false`. See docs/security-ux-guards.md and
 * tests/ci-workflow.test.ts for the enforced invariant.
 */
const isDevOrTest =
	process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

/**
 * CSP connect-src API allowlist (issue #859):
 *
 * `connect-src` governs every fetch/XHR/WebSocket/EventSource the app can
 * open, so it is the directive that gates wallet, AA, and payment traffic
 * to the Mux API, Soroban RPC, and Horizon. It must be an explicit,
 * fail-closed allowlist:
 *
 * - Origins come from a single typed source (`NEXT_PUBLIC_API_ORIGINS`,
 *   comma-separated) so ops can extend the allowlist without editing code.
 * - Safe defaults cover the known Mux API / Stellar RPC / Horizon hosts.
 * - Wildcards (`*`), broad schemes (`http:`, `https:`, `ws:`, `wss:`),
 *   and malformed entries are rejected rather than silently permitted, so
 *   an unset or typo'd origin can never widen the policy.
 * - `'self'` is always included; the directive is never empty.
 */
const DEFAULT_CONNECT_SRC_ORIGINS = [
	"'self'",
	"https://api.muxprotocol.io",
	"https://soroban-testnet.stellar.org",
	"https://horizon-testnet.stellar.org",
	"https://horizon.stellar.org",
];

const BROAD_SCHEME_SOURCES = new Set([
	"*",
	"http:",
	"https:",
	"ws:",
	"wss:",
	"data:",
	"blob:",
]);

/**
 * Parse and validate a single connect-src source. Returns the normalized
 * origin, or `null` when the entry is empty, a wildcard, a broad scheme, or
 * otherwise not a concrete origin. Fail-closed: invalid entries are dropped.
 */
function normalizeConnectSrcOrigin(raw: string): string | null {
	const value = raw.trim();
	if (value.length === 0) return null;
	if (value === "'self'") return value;
	if (BROAD_SCHEME_SOURCES.has(value.toLowerCase())) return null;
	if (value.includes("*")) return null;

	try {
		const url = new URL(value);
		if (url.protocol !== "https:" && url.protocol !== "wss:") return null;
		return url.origin;
	} catch {
		return null;
	}
}

/**
 * Resolve the connect-src allowlist from env, falling back to safe defaults.
 * Always includes `'self'` and never returns an empty list.
 */
function resolveConnectSrcOrigins(): string[] {
	const configured = (process.env.NEXT_PUBLIC_API_ORIGINS ?? "")
		.split(",")
		.map(normalizeConnectSrcOrigin)
		.filter((origin): origin is string => origin !== null);

	const origins = new Set<string>(["'self'", ...DEFAULT_CONNECT_SRC_ORIGINS, ...configured]);
	return Array.from(origins);
}

const connectSrcOrigins = resolveConnectSrcOrigins();

/**
 * Content-Security-Policy. Only `connect-src` is parameterized here; all
 * other directives keep their existing values. `connect-src` is built from
 * the validated allowlist above so it can never contain a wildcard or broad
 * scheme source.
 */
const contentSecurityPolicy = [
	"default-src 'self'",
	`connect-src ${connectSrcOrigins.join(" ")}`,
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
	/**
	 * Compress responses with gzip / brotli.
	 * Reduces transfer size for the analytics bundle and other large pages.
	 */
	compress: true,

	/**
	 * Source maps production policy: enabled only in dev/test, disabled
	 * (fail-closed) everywhere else so production never ships readable
	 * source maps. Do not hardcode `true` here.
	 */
	productionBrowserSourceMaps: isDevOrTest,

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

	/**
	 * The dev-mode build indicator overlay renders a full-viewport portal
	 * that intercepts pointer events, which blocks Playwright (and manual
	 * QA) from clicking through the app in `next dev`. Disabling it only
	 * affects local development UI, not production behavior.
	 */
	devIndicators: false,

	/**
	 * Security headers. `connect-src` is derived from the validated API
	 * allowlist so wallet/AA/payment traffic is restricted to known origins.
	 */
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{
						key: "Content-Security-Policy",
						value: contentSecurityPolicy,
					},
				],
			},
		];
	},
};

export default nextConfig;
