/**
 * Environment variable validation utility.
 *
 * Validates required environment variables at build/startup time.
 * Follows Next.js conventions: public vars are prefixed with NEXT_PUBLIC_.
 * Private vars are only validated on the server side.
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
		name: "MUX_API_KEY",
		required: false,
		description: "Mux Protocol API key for server-side requests",
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
