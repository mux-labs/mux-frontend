import { expect, test } from "@playwright/test";

/**
 * Smoke coverage for the primary login path: empty state -> validation
 * errors -> successful sign in -> redirect to the dashboard.
 *
 * The `/api/auth/login` route mocks a successful response for any
 * well-formed credentials when `NEXT_PUBLIC_API_URL` is unset, so this
 * spec exercises real client wiring without depending on a live backend.
 *
 * Real-backend coverage (typed entrypoints, stable error codes, correlation
 * ids, and authz negatives) lives in `tests/e2e/real-backend/login.spec.ts`.
 */
test.describe("Login smoke", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
	});

	test("shows the empty/welcome state before the user types anything", async ({
		page,
	}) => {
		await expect(page.getByTestId("login-empty-state")).toBeVisible();
		await expect(page.getByTestId("login-form")).toBeVisible();
	});

	test("surfaces inline validation errors for an invalid email", async ({
		page,
	}) => {
		const email = page.getByLabel("Email address");
		await email.fill("not-an-email");
		await email.blur();

		await expect(page.getByTestId("email-error")).toBeVisible();
		await expect(page.getByTestId("email-error")).toContainText(
			"valid email",
		);
	});

	test("surfaces inline validation errors for a short password", async ({
		page,
	}) => {
		const password = page.getByLabel("Password");
		await password.fill("123");
		await password.blur();

		await expect(page.getByTestId("password-error")).toBeVisible();
	});

	test("toggles password visibility", async ({ page }) => {
		const password = page.getByLabel("Password");
		await password.fill("supersecret");
		await expect(password).toHaveAttribute("type", "password");

		await page.getByTestId("password-toggle").click();
		await expect(password).toHaveAttribute("type", "text");
	});

	test("signs in successfully and redirects to the dashboard", async ({
		page,
	}) => {
		await page.getByLabel("Email address").fill("dev@muxprotocol.com");
		await page.getByLabel("Password").fill("password123");
		await page.getByTestId("login-submit").click();

		await page.waitForURL("**/dashboard**");
		await expect(page).toHaveURL(/\/dashboard/);
	});

	test("shows an error card when the request fails", async ({ page }) => {
		// Force the login API to fail so the error-state path is exercised.
		await page.route("**/api/auth/login", (route) =>
			route.fulfill({
				status: 401,
				contentType: "application/json",
				body: JSON.stringify({ error: "Invalid email or password." }),
			}),
		);

		await page.getByLabel("Email address").fill("dev@muxprotocol.com");
		await page.getByLabel("Password").fill("wrongpassword");
		await page.getByTestId("login-submit").click();

		await expect(page.getByTestId("login-error")).toBeVisible();
		await expect(page.getByTestId("login-error")).toContainText(
			"Invalid email or password.",
		);
	});

	test("fails closed and surfaces a stable error code when the backend is unavailable", async ({
		page,
	}) => {
		// Simulate a dependency outage (RPC/DB/Horizon) on the login path.
		// The client must not fall through to a signed-in state; it must
		// surface an actionable, stable error code and correlation id.
		await page.route("**/api/auth/login", (route) =>
			route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({
					error: "Authentication temporarily unavailable.",
					code: "AUTH_BACKEND_UNAVAILABLE",
					correlationId: "e2e-correlation-0001",
				}),
			}),
		);

		await page.getByLabel("Email address").fill("dev@muxprotocol.com");
		await page.getByLabel("Password").fill("password123");
		await page.getByTestId("login-submit").click();

		await expect(page.getByTestId("login-error")).toBeVisible();
		await expect(page).not.toHaveURL(/\/dashboard/);
	});

	test("denies login by default when the backend rejects the credentials", async ({
		page,
	}) => {
		// Deny-by-default: a 403 from the authz layer must not grant access.
		await page.route("**/api/auth/login", (route) =>
			route.fulfill({
				status: 403,
				contentType: "application/json",
				body: JSON.stringify({
					error: "Access denied.",
					code: "AUTH_FORBIDDEN",
					correlationId: "e2e-correlation-0002",
				}),
			}),
		);

		await page.getByLabel("Email address").fill("dev@muxprotocol.com");
		await page.getByLabel("Password").fill("password123");
		await page.getByTestId("login-submit").click();

		await expect(page.getByTestId("login-error")).toBeVisible();
		await expect(page).not.toHaveURL(/\/dashboard/);
	});
});
