/**
 * Environment variable validation utility.
 *
 * Validates required environment variables at build/startup time.
 * Follows Next.js conventions: public vars are prefixed with NEXT_PUBLIC_.
 * Private vars are only validated on the server side.
 *
 * Server-only guard (#694):
 *   MUX_API_SECRET and MUX_API_KEY must never be read from client-side code.
 *   Next.js strips non-NEXT_PUBLIC_* vars from the browser bundle at build
 *   time, so these will always be undefined in the browser.  As an extra
 *   defence-in-depth measure, `getServerOnlyEnv()` throws at runtime when
 *   called from a client context (window is defined), making the violation
 *   immediately visible rather than silently returning undefined.
 */

interface EnvVar {
	name: string;
	required: boolean;
	defaultValue?: string;
	description?: string;
}

const publicEnvVars: EnvVar[] = [
	{
		name: "NEXT_PUBLIC_APP_URL",
		required: false,
		defaultValue: "http://localhost:3000",
		description: "Public-facing URL of the application",
	},
	{
		name: "NEXT_PUBLIC_API_URL",
		required: false,
		description: "Public API base URL for client-side requests",
	},
	{
		name: "NEXT_PUBLIC_MUX_API_URL",
		required: false,
		defaultValue: "https://api.muxprotocol.com",
		description: "Legacy alias for the API base URL",
	},
	{
		name: "NEXT_PUBLIC_API_BASE",
		required: false,
		description: "Legacy alias for the API base URL",
	},
];

const serverEnvVars: EnvVar[] = [
	{
		name: "SESSION_JWT_SECRET",
		required: false,
		description:
			"HMAC secret used to sign/verify the session JWT in middleware. No default: when unset, protected routes fail closed in production builds (see src/middleware.ts).",
	},
	{
		name: "MUX_API_KEY",
		required: false,
		description: "Mux Protocol API key for server-side requests",
	},
	{
		name: "MUX_BACKEND_URL",
		required: false,
		description:
			"Server-only base URL of mux-backend, used by /api/spending-limits to proxy GET/PUT. No default: when unset the route returns 503 instead of fabricating usage data (see src/lib/api/config.ts::getBackendApiBaseUrl()).",
	},
	{
		name: "MUX_API_SECRET",
		required: false,
		description: "Mux Protocol API secret for server-side requests",
	},
	{
		name: "NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID",
		required: false,
		description: "WalletConnect Project ID",
	},
];

const allEnvVars = [...publicEnvVars, ...serverEnvVars];

/** Names of vars that must never be read outside a server context. */
const SERVER_ONLY_VAR_NAMES: ReadonlySet<string> = new Set(
	serverEnvVars
		.map((v) => v.name)
		.filter((name) => !name.startsWith("NEXT_PUBLIC_")),
);

/**
 * Returns true when the current execution context is a browser (client) JS
 * bundle.  Uses `typeof window` rather than `window` directly so that the
 * check itself does not throw in a non-browser environment.
 */
function isClientSide(): boolean {
	return typeof window !== "undefined";
}

/**
 * Guard that throws if called from client-side (browser) code. (#694)
 *
 * Next.js strips server-only env vars from the browser bundle at build time,
 * but importing `process.env.MUX_API_SECRET` directly in a client component
 * would silently return `undefined` rather than failing loudly.  This guard
 * makes the mistake visible at runtime in development before it reaches prod.
 *
 * @param varName - The variable name being accessed (used in the error message).
 */
export function assertServerSide(varName: string): void {
	if (isClientSide()) {
		throw new Error(
			`[env] Attempted to read server-only variable "${varName}" from a client-side context. ` +
				`Server-only variables (${[...SERVER_ONLY_VAR_NAMES].join(", ")}) must only be accessed ` +
				`inside Next.js API routes, Server Components, or server actions — never in "use client" code.`,
		);
	}
}

/**
 * Validates environment variables against the defined schema.
 * Logs warnings for missing optional vars and errors for missing required vars.
 * Call this at the top of next.config.ts or layout.tsx for early validation.
 *
 * @param env - The process.env object (or a subset of it)
 * @returns An object with the validated env vars, using defaults where applicable
 */
export function validateEnv(
	env: Record<string, string | undefined> = process.env,
): Record<string, string | undefined> {
	const errors: string[] = [];
	const warnings: string[] = [];

	for (const envVar of allEnvVars) {
		const value = env[envVar.name];

		if (!value) {
			if (envVar.required) {
				errors.push(
					`Missing required environment variable: ${envVar.name}${envVar.description ? ` (${envVar.description})` : ""}`,
				);
			} else if (envVar.defaultValue) {
				warnings.push(
					`Environment variable ${envVar.name} is not set. Using default: "${envVar.defaultValue}"${envVar.description ? ` (${envVar.description})` : ""}`,
				);
			} else {
				warnings.push(
					`Environment variable ${envVar.name} is not set.${envVar.description ? ` (${envVar.description})` : ""}`,
				);
			}
		}
	}

	if (errors.length > 0) {
		if (
			typeof process !== "undefined" &&
			process.env?.NODE_ENV === "production"
		) {
			throw new Error(`Environment validation failed:\n${errors.join("\n")}`);
		}
		console.error(`[env] Environment validation errors:\n${errors.join("\n")}`);
	}

	if (warnings.length > 0) {
		console.warn(
			`[env] Environment validation warnings:\n${warnings.join("\n")}`,
		);
	}

	return env;
}

/**
 * Validates environment and returns a config object with typed values.
 * Safe to call on both client and server.
 *
 * Documented defaults (e.g. NEXT_PUBLIC_MUX_API_URL) are merged in only for
 * NODE_ENV=production, so a deployed build never silently falls back to
 * mock data just because an operator forgot to set a var. Local dev/test
 * keep the current opt-in behavior (unset = mock fallback in API routes).
 */
export function getEnv(): Record<string, string | undefined> {
	const source =
		typeof process === "undefined" || !process.env ? {} : process.env;

	if (source.NODE_ENV !== "production") {
		return source;
	}

	const result: Record<string, string | undefined> = { ...source };
	for (const envVar of allEnvVars) {
		if (!result[envVar.name] && envVar.defaultValue !== undefined) {
			result[envVar.name] = envVar.defaultValue;
		}
	}
	return result;
}

/**
 * Reads a server-only environment variable.  Throws at runtime if called
 * from a browser (client) bundle so the misconfiguration is immediately
 * visible. (#694)
 *
 * Use this instead of reading `process.env.MUX_API_SECRET` (etc.) directly
 * inside API routes and Server Components.
 *
 * @param name - The server-only variable name to read.
 * @returns The variable value, or `undefined` when unset.
 */
export function getServerOnlyEnv(
	name: string,
): string | undefined {
	assertServerSide(name);
	return getEnv()[name];
}
