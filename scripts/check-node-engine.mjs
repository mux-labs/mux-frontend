#!/usr/bin/env node
/**
 * Fail-closed Node.js version gate, run as the `preinstall` hook.
 *
 * `package.json#engines.node` is the single source of truth. `.npmrc` sets
 * `engine-strict=true`; this script is the belt-and-braces guard that runs
 * before any dependency is resolved and fails with a stable error code on
 * every installer. The hard floor is Node 18; the declared range may only be
 * stricter. See docs/node-engine.md.
 *
 * Kept dependency-free and syntax-conservative so it can still print a clear
 * error on the old Node versions it exists to reject.
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const MIN_SUPPORTED_NODE_MAJOR = 18;

/** Parses "22", "22.1" or "v22.1.3" into [major, minor, patch], or null. */
export function parseVersion(value) {
	const match = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(String(value).trim());
	if (!match) return null;
	return [Number(match[1]), Number(match[2] || 0), Number(match[3] || 0)];
}

/**
 * Returns the minimum version from a `>=X[.Y.Z]` engines range, or null for
 * any other shape. Only `>=` is supported on purpose: an unrecognised range
 * fails closed instead of being guessed at.
 */
export function parseMinimum(range) {
	const match = /^>=\s*(v?\d+(?:\.\d+){0,2})$/.exec(String(range || "").trim());
	return match ? parseVersion(match[1]) : null;
}

export function compareVersions(a, b) {
	for (let i = 0; i < 3; i++) {
		if (a[i] !== b[i]) return a[i] - b[i];
	}
	return 0;
}

/** Returns an error message, or null when `current` satisfies `range`. */
export function checkNodeEngine(range, current) {
	const minimum = parseMinimum(range);
	if (!minimum) {
		return `ENGINE_RANGE_INVALID: package.json engines.node must be a ">=X.Y.Z" range, got ${JSON.stringify(range)}.`;
	}
	if (minimum[0] < MIN_SUPPORTED_NODE_MAJOR) {
		return `ENGINE_RANGE_TOO_LOW: engines.node ${JSON.stringify(range)} is below the Node ${MIN_SUPPORTED_NODE_MAJOR} floor.`;
	}
	const version = parseVersion(current);
	if (!version || compareVersions(version, minimum) < 0) {
		return `ENGINE_UNSUPPORTED_NODE: Node ${current} does not satisfy engines.node ${JSON.stringify(range)}. Install a supported version (see .nvmrc) and retry.`;
	}
	return null;
}

const isMain =
	process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
	const pkg = JSON.parse(
		readFileSync(new URL("../package.json", import.meta.url), "utf8"),
	);
	const error = checkNodeEngine(
		pkg.engines && pkg.engines.node,
		process.version,
	);
	if (error) {
		console.error(`\n  ⛔  ${error}\n`);
		process.exit(1);
	}
}
