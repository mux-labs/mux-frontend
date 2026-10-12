import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = resolve(process.cwd(), "scripts/check-package-manager.mjs");

function runCheck(userAgent?: string) {
	const env = { ...process.env };
	for (const key of Object.keys(env)) {
		if (key.toLowerCase() === "npm_config_user_agent") delete env[key];
	}
	if (userAgent !== undefined) env.npm_config_user_agent = userAgent;

	return spawnSync(process.execPath, [scriptPath], {
		env,
		encoding: "utf8",
	});
}

describe("check-package-manager script", () => {
	it("accepts a pnpm user agent with a version", () => {
		expect(runCheck("pnpm/9.12.0 npm/? node/v22.1.0").status).toBe(0);
	});

	it.each([
		"npm/10.8.2 node/v22.1.0",
		"yarn/1.22.22",
		"bun/1.1.0",
		"",
		undefined,
	])("rejects %s", (userAgent) => {
		const result = runCheck(userAgent);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("PACKAGE_MANAGER_UNSUPPORTED");
	});

	it.each(["pnpm/", "pnpm/evil", "not-pnpm/9.12.0"])(
		"rejects malformed pnpm agent %s",
		(userAgent) => {
			const result = runCheck(userAgent);
			expect(result.status).toBe(1);
			expect(result.stderr).toContain("PACKAGE_MANAGER_UNSUPPORTED");
		},
	);

	it("exits non-zero for an unsupported package manager", () => {
		const result = runCheck("npm/10.8.2");

		expect(result.status).toBe(1);
		expect(result.stderr).toContain("PACKAGE_MANAGER_UNSUPPORTED");
	});
});
