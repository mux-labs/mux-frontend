/**
 * Route-tree drift guard for `/demo/dashboard/*` vs `/dashboard/*` (#631).
 *
 * The demo tree is a deliberate parallel of the production dashboard that
 * renders mock data with no authenticated session (`DashboardLayout
 * requireAuth={false}`, `useWallets({ demo: true })`, `/api/demo/*` routes).
 * A *full* second copy of every route invites silent drift — a page fixed on
 * one side and forgotten on the other.
 *
 * This test pins the split: the two trees must expose the same set of routes
 * except for the explicitly-listed, reason-tagged exceptions below. Adding a
 * route to only one tree fails here until it is either mirrored or added to an
 * allowlist with a rationale.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APP_DIR = join(process.cwd(), "src", "app");
const PROD_DIR = join(APP_DIR, "dashboard");
const DEMO_DIR = join(APP_DIR, "demo", "dashboard");

const ROUTE_FILES = new Set(["page.tsx", "page.ts", "page.jsx", "page.js"]);

/** Collect every route segment (relative dir holding a `page.*`) under `dir`. */
function collectRoutes(dir: string, base = dir): string[] {
	const routes: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (entry.name === "__tests__") continue;
			routes.push(...collectRoutes(join(dir, entry.name), base));
		} else if (ROUTE_FILES.has(entry.name)) {
			const rel = dir.slice(base.length).replace(/\\/g, "/");
			routes.push(rel === "" ? "/" : rel);
		}
	}
	return routes.sort();
}

/**
 * Routes that intentionally exist on only one side. Every entry needs a
 * reason; an un-listed asymmetry is treated as accidental drift.
 */
const PROD_ONLY: Record<string, string> = {
	"/api-keys/[id]/usage":
		"Per-key usage analytics reads real API-key activity; there is no mock fixture for it.",
	"/settings/team":
		"Team management is an authenticated-account feature with no demo equivalent.",
};

const DEMO_ONLY: Record<string, string> = {
	"/users":
		"Demo-only roster screen used for walkthroughs; no production counterpart is planned.",
};

describe("/demo/dashboard vs /dashboard route parity (#631)", () => {
	const prodRoutes = collectRoutes(PROD_DIR);
	const demoRoutes = collectRoutes(DEMO_DIR);

	it("has no production route missing from the demo tree (beyond the allowlist)", () => {
		const missingFromDemo = prodRoutes.filter(
			(route) => !demoRoutes.includes(route) && !(route in PROD_ONLY),
		);
		expect(missingFromDemo).toEqual([]);
	});

	it("has no demo route missing from the production tree (beyond the allowlist)", () => {
		const missingFromProd = demoRoutes.filter(
			(route) => !prodRoutes.includes(route) && !(route in DEMO_ONLY),
		);
		expect(missingFromProd).toEqual([]);
	});

	it("keeps the prod-only / demo-only allowlists accurate", () => {
		for (const route of Object.keys(PROD_ONLY)) {
			expect(prodRoutes, `${route} listed in PROD_ONLY`).toContain(route);
			expect(demoRoutes, `${route} listed in PROD_ONLY`).not.toContain(route);
		}
		for (const route of Object.keys(DEMO_ONLY)) {
			expect(demoRoutes, `${route} listed in DEMO_ONLY`).toContain(route);
			expect(prodRoutes, `${route} listed in DEMO_ONLY`).not.toContain(route);
		}
	});
});
