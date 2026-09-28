#!/usr/bin/env node
/**
 * Bundle analyze + budget (issue #841).
 *
 * Reports the gzip size of every client JS chunk emitted by `next build`
 * under `.next/static/chunks` and fails (exit 1) when a budget is exceeded.
 * Fail-closed: a missing build output is treated as a failure, not a pass.
 *
 * Budgets (gzip, KB) can be tuned via env without code changes:
 *   BUNDLE_BUDGET_TOTAL_KB  total client JS   (default 1500)
 *   BUNDLE_BUDGET_CHUNK_KB  largest one chunk (default 350)
 *
 * Usage: pnpm run build && pnpm run analyze:bundle
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const CHUNKS_DIR = join(process.cwd(), ".next", "static", "chunks");
const TOTAL_BUDGET_KB = Number(process.env.BUNDLE_BUDGET_TOTAL_KB ?? 1500);
const CHUNK_BUDGET_KB = Number(process.env.BUNDLE_BUDGET_CHUNK_KB ?? 350);
const TOP_N = 10;

function listJsFiles(dir) {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return listJsFiles(path);
		return name.endsWith(".js") ? [path] : [];
	});
}

const kb = (bytes) => bytes / 1024;

let files;
try {
	files = listJsFiles(CHUNKS_DIR);
} catch {
	console.error(
		`[bundle-budget] BUNDLE_OUTPUT_MISSING: ${CHUNKS_DIR} not found. Run \`pnpm run build\` first.`,
	);
	process.exit(1);
}

if (!Number.isFinite(TOTAL_BUDGET_KB) || !Number.isFinite(CHUNK_BUDGET_KB)) {
	console.error(
		"[bundle-budget] BUNDLE_BUDGET_INVALID: budgets must be numbers.",
	);
	process.exit(1);
}

const chunks = files
	.map((file) => ({
		file: relative(CHUNKS_DIR, file),
		gzip: gzipSync(readFileSync(file)).length,
	}))
	.sort((a, b) => b.gzip - a.gzip);

const total = chunks.reduce((sum, c) => sum + c.gzip, 0);

console.log(
	`[bundle-budget] ${chunks.length} chunks, top ${TOP_N} by gzip size:`,
);
for (const c of chunks.slice(0, TOP_N)) {
	console.log(`  ${kb(c.gzip).toFixed(1).padStart(8)} KB  ${c.file}`);
}
console.log(
	`[bundle-budget] total ${kb(total).toFixed(1)} KB / budget ${TOTAL_BUDGET_KB} KB (gzip)`,
);

const failures = [];
if (kb(total) > TOTAL_BUDGET_KB) {
	failures.push(
		`BUNDLE_TOTAL_OVER_BUDGET: ${kb(total).toFixed(1)} KB > ${TOTAL_BUDGET_KB} KB`,
	);
}
for (const c of chunks.filter((c) => kb(c.gzip) > CHUNK_BUDGET_KB)) {
	failures.push(
		`BUNDLE_CHUNK_OVER_BUDGET: ${c.file} ${kb(c.gzip).toFixed(1)} KB > ${CHUNK_BUDGET_KB} KB`,
	);
}

if (failures.length > 0) {
	for (const f of failures) console.error(`[bundle-budget] ${f}`);
	process.exit(1);
}
console.log("[bundle-budget] OK");
