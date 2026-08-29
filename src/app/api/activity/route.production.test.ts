/**
 * Regression coverage for the production/mock split on GET /api/activity.
 *
 * Before this test, the mock activity fallback ran unconditionally
 * regardless of NODE_ENV, so a production deployment with no
 * NEXT_PUBLIC_API_URL configured would silently serve fabricated activity
 * items instead of failing loudly. See src/lib/api/runtimeMode.ts /
 * isMockFallbackAllowed() for the pattern this mirrors from
 * src/app/api/wallets/route.ts.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/activity in production without a configured backend", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("returns 503 instead of falling back to mock activity data", async () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "");
		vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "");
		vi.stubEnv("NEXT_PUBLIC_API_BASE", "");
		vi.stubEnv("NODE_ENV", "production");

		const res = await GET();
		expect(res.status).toBe(503);
		const body = await res.json();
		expect(body.error).toBe("backend_unavailable");
	});
});
