#!/usr/bin/env node
/**
 * Fails fast if this project is being installed with npm or yarn.
 * pnpm-lock.yaml is the single source of truth for dependency
 * resolution here - a stray package-lock.json/yarn.lock causes
 * dependency drift between contributors and CI.
 */

const userAgent = process.env.npm_config_user_agent || "";

if (!userAgent.startsWith("pnpm")) {
	console.error("\n  ⛔  This repository only supports pnpm.\n");
	console.error(
		`      Detected package manager: ${userAgent.split("/")[0] || "unknown"}`,
	);
	console.error("      Please run: pnpm install\n");
	console.error(
		"      If pnpm isn't installed: corepack enable && corepack prepare pnpm@9.15.4 --activate\n",
	);
	process.exit(1);
}
