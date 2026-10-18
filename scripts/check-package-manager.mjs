#!/usr/bin/env node
// Guard against running installs with a package manager other than pnpm.
// pnpm-lock.yaml is the single source of truth (see PNPM_LOCKFILE_README.md).

const PACKAGE_MANAGER_UNSUPPORTED = "PACKAGE_MANAGER_UNSUPPORTED";

/**
 * @param {string | undefined} userAgent value of npm_config_user_agent
 * @returns {string | null} error message, or null when pnpm is detected
 */
export function checkPackageManager(userAgent) {
  const agent = typeof userAgent === "string" ? userAgent : "";

  // Require a non-empty version component after "pnpm/" so a bare "pnpm/"
  // (or "pnpm/evil") is not silently treated as a valid pnpm agent.
  if (/^pnpm\/\d/.test(agent)) {
    return null;
  }

  const detected = agent.split("/")[0] || "unknown";

  return (
    `${PACKAGE_MANAGER_UNSUPPORTED}: this project must be installed with pnpm ` +
    `(detected: ${detected}). See PNPM_LOCKFILE_README.md.`
  );
}

const isMain =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMain) {
  const message = checkPackageManager(process.env.npm_config_user_agent);

  if (message) {
    console.error(message);
    process.exit(1);
  }
}
