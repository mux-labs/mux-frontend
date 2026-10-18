import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { checkPackageManager } from "../scripts/check-package-manager.mjs";

const PACKAGE_MANAGER_UNSUPPORTED = "PACKAGE_MANAGER_UNSUPPORTED";

const scriptPath = fileURLToPath(
  new URL("../scripts/check-package-manager.mjs", import.meta.url),
);

describe("checkPackageManager", () => {
  it("accepts a pnpm user agent with a version", () => {
    expect(checkPackageManager("pnpm/9.12.0 npm/? node/v22.1.0")).toBeNull();
  });

  it.each([
    ["npm", "npm/10.8.2 node/v22.1.0"],
    ["yarn", "yarn/1.22.22"],
    ["bun", "bun/1.1.0"],
    ["empty", ""],
    ["undefined", undefined],
  ])("rejects a %s user agent", (_label, agent) => {
    const message = checkPackageManager(agent);
    expect(typeof message).toBe("string");
    expect(message?.startsWith(PACKAGE_MANAGER_UNSUPPORTED)).toBe(true);
  });

  it("rejects a malformed pnpm agent with no version", () => {
    const message = checkPackageManager("pnpm/");
    expect(typeof message).toBe("string");
    expect(message?.startsWith(PACKAGE_MANAGER_UNSUPPORTED)).toBe(true);
  });
});

describe("check-package-manager script", () => {
  it("exits non-zero with PACKAGE_MANAGER_UNSUPPORTED for a non-pnpm agent", () => {
    const result = spawnSync(process.execPath, [scriptPath], {
      env: { ...process.env, npm_config_user_agent: "npm/10.8.2" },
      encoding: "utf8",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(PACKAGE_MANAGER_UNSUPPORTED);
  });
});
