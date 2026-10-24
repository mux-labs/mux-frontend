import { getBackendApiBaseUrl } from "@/lib/api/config";

/**
 * Ordered list of environment variables that may carry the backend base URL.
 * The first non-empty candidate wins.
 */
export const BACKEND_URL_CANDIDATES = [
  "MUX_BACKEND_URL",
  "NEXT_PUBLIC_MUX_BACKEND_URL",
  "BACKEND_URL",
] as const;

type EnvLike = Record<string, string | undefined>;

/**
 * Resolve the backend base URL from the environment.
 *
 * Delegates to {@link getBackendApiBaseUrl} so both helpers apply the same
 * acceptance rules (http/https only, no embedded credentials) and the same
 * normalization (origin + pathname, trailing slash stripped).
 */
export function getBackendBaseUrl(env: EnvLike = process.env): string | null {
  for (const key of BACKEND_URL_CANDIDATES) {
    const raw = env[key];
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const normalized = getBackendApiBaseUrl({ [key]: trimmed });
    if (normalized) return normalized;
  }
  return null;
}
