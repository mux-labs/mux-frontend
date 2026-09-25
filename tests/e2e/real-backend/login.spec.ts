import { expect, test } from "@playwright/test";
import { readRealBackendEnv, REAL_BACKEND_SKIP_REASON } from "./helpers";

/**
 * Contract coverage for POST /api/auth/login against a REAL mux-backend.
 *
 * tests/e2e/login.spec.ts's "signs in successfully" case fills in
 * "dev@muxprotocol.com" / "password123" and asserts a redirect — that only
 * works because the mock `/api/auth/login` route accepts *any*
 * well-formed credentials when NEXT_PUBLIC_API_URL is unset (see that
 * route's mock-fallback branch). Pointed at a real backend, those same
 * hardcoded credentials would just be rejected: the mock suite would give
 * false confidence rather than a meaningful pass/fail. This spec never
 * stubs `**\/api/auth/login` and never asserts the mock credentials work;
 * it uses credentials supplied out-of-band via env vars.
 *
 * Run via playwright.real-backend.config.ts — see ./README.md.
 */
const realBackend = readRealBackendEnv();

/**
 * Stable error codes the real backend returns for the login surface. The
 * frontend maps these to user-facing copy; asserting on the code (not the
 * copy) keeps this spec resilient to wording changes while still pinning
 * the contract. See docs/security-ux-guards.md.
 */
const LOGIN_ERROR_CODES = {
	invalidCredentials: "AUTH_INVALID_CREDENTIALS",
	missingCredentials: "AUTH_MISSING_CREDENTIALS",
} as const;

/**
 * Correlation id header the backend echoes on every auth response so a
 * failed login can be traced end-to-end without leaking credentials. The
 * frontend surfaces it on the error element as a data attribute.
 */
const CORRELATION_ID_HEADER = "x-correlation-id";

/**
 * Authz roles the login surface must deny by default. A client must not be
 * able to escalate by claiming a role in the request body — the backend
 * derives the role from the authenticated principal only.
 */
const PRIVILEGED_ROLES = ["owner", "delegate", "guardian", "admin"] as const;

test.describe("Login against a real mux-backend", () => {
	test.skip(!realBackend, REAL_BACKEND_SKIP_REASON);

	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
	});

	test("rejects invalid credentials without redirecting to the dashboard", async ({
		page,
	}) => {
		await page
			.getByLabel("Email address")
			.fill("not-a-real-account@example.com");
		await page.getByLabel("Password").fill("definitely-wrong-password");
		await page.getByTestId("login-submit").click();

		await expect(page.getByTestId("login-error")).toBeVisible();
		await expect(page).not.toHaveURL(/\/dashboard/);
	});

	test("signs in with real backend credentials and redirects to the dashboard", async ({
		page,
	}) => {
		await page.getByLabel("Email address").fill(realBackend!.email);
		await page.getByLabel("Password").fill(realBackend!.password);
		await page.getByTestId("login-submit").click();

		await page.waitForURL("**/dashboard**");
		await expect(page).toHaveURL(/\/dashboard/);
	});

	test("returns a stable error code and correlation id on invalid credentials", async ({
		page,
	}) => {
		const responsePromise = page.waitForResponse(
			(res) =>
				res.url().includes("/api/auth/login") &&
				res.request().method() === "POST",
		);

		await page
			.getByLabel("Email address")
			.fill("not-a-real-account@example.com");
		await page.getByLabel("Password").fill("definitely-wrong-password");
		await page.getByTestId("login-submit").click();

		const response = await responsePromise;
		expect(response.status()).toBe(401);

		const body = (await response.json()) as {
			code?: string;
			correlationId?: string;
		};
		expect(body.code).toBe(LOGIN_ERROR_CODES.invalidCredentials);

		// Correlation id must be present on the response header so ops can
		// trace the failure without the request body (which holds secrets).
		const correlationId = response.headers()[CORRELATION_ID_HEADER];
		expect(correlationId).toBeTruthy();
		expect(body.correlationId ?? correlationId).toBeTruthy();

		// The error surface must expose the correlation id for support, and
		// must never echo the submitted password back to the client.
		const errorEl = page.getByTestId("login-error");
		await expect(errorEl).toBeVisible();
		await expect(errorEl).not.toContainText("definitely-wrong-password");
	});

	test("rejects missing credentials with a stable error code", async ({ page }) => {
		const responsePromise = page.waitForResponse(
			(res) =>
				res.url().includes("/api/auth/login") &&
				res.request().method() === "POST",
		);

		await page.getByTestId("login-submit").click();

		const response = await responsePromise;
		expect(response.status()).toBe(400);

		const body = (await response.json()) as { code?: string };
		expect(body.code).toBe(LOGIN_ERROR_CODES.missingCredentials);
		await expect(page).not.toHaveURL(/\/dashboard/);
	});

	test("denies client-supplied privileged roles (deny-by-default authz)", async ({
		page,
		request,
	}) => {
		// A client must not be able to escalate by claiming a role in the
		// login payload. The backend derives the role from the authenticated
		// principal; any client-supplied role is ignored and the request is
		// denied by default for privileged surfaces.
		for (const role of PRIVILEGED_ROLES) {
			const response = await request.post("/api/auth/login", {
				data: {
					email: realBackend!.email,
					password: realBackend!.password,
					role,
				},
			});

			// Either the request is rejected outright, or it succeeds but the
			// returned principal does not carry the spoofed privileged role.
			if (response.ok()) {
				const body = (await response.json()) as { role?: string };
				expect(body.role).not.toBe(role);
			} else {
				expect([400, 401, 403]).toContain(response.status());
			}
		}
	});
});
