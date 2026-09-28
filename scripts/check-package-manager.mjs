#!/usr/bin/env node
/**
 * Fails fast if this project is being installed with anything but pnpm.
 * pnpm-lock.yaml is the single source of truth for dependency resolution
 * here; a stray package-lock.json/yarn.lock causes dependency drift between
 * contributors and CI. Runs from the `preinstall` hook after
 * check-node-engine.mjs (see PNPM_LOCKFILE_README.md).
 */

import { pathToFileURL } from "node:url";

/** Returns an error message, or null when `userAgent` is pnpm's. */
export function checkPackageManager(userAgent) {
	const agent = String(userAgent || "");
	if (agent.startsWith("pnpm/")) return null;
	return `PACKAGE_MANAGER_UNSUPPORTED: this repository only supports pnpm (detected: ${agent.split("/")[0] || "unknown"}). Run: pnpm install`;
}

const isMain =
	process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
	const error = checkPackageManager(process.env.npm_config_user_agent);
	if (error) {
		console.error(`\n  ⛔  ${error}\n`);
		process.exit(1);
	}
}
