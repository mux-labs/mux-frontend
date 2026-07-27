import { expect, test } from "@playwright/test";

/**
 * Smoke coverage for the primary login path: empty state -> validation
 * errors -> successful sign in -> redirect to the dashboard.
 *
 * The `/api/auth/login` route mocks a successful response for any
 * well-formed credentials when `NEXT_PUBLIC_API_URL` is unset, so this
 * spec exercises real client wiring without depending on a live backend.
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
});
