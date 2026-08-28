import { expect, test } from "@playwright/test";

/**
 * Smoke coverage for the notifications bell in the dashboard top nav (#618).
 *
 * The bell used to be a dead button with a permanently-on fake red dot and
 * NotificationsPanel was never mounted. This spec exercises the real user
 * path: sign in, open the panel from the bell, mark all read, and confirm
 * the unread dot clears.
 *
 * `/dashboard/*` is auth-gated (see src/middleware.ts) so we sign in through
 * the real login flow. With `NEXT_PUBLIC_API_URL` unset the mock
 * `/api/notifications` route serves seeded notifications with unread items.
 */
async function signIn(page: import("@playwright/test").Page) {
	await page.goto("/login");
	await page.getByLabel("Email address").fill("dev@muxprotocol.com");
	await page.getByLabel("Password").fill("password123");
	await page.getByTestId("login-submit").click();
	await page.waitForURL("**/dashboard**");
}

test.describe("Notifications bell smoke", () => {
	test("opens the notifications panel from the top-nav bell", async ({
		page,
	}) => {
		await signIn(page);

		await expect(page.getByTestId("notifications-panel")).toBeHidden();
		await page.getByTestId("notifications-bell").click();
		await expect(page.getByTestId("notifications-panel")).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Notifications" }),
		).toBeVisible();
	});

	test("marks all read and clears the unread dot", async ({ page }) => {
		await signIn(page);

		await expect(page.getByTestId("notifications-unread-dot")).toBeVisible();

		await page.getByTestId("notifications-bell").click();
		await page
			.getByRole("button", { name: /mark all read/i })
			.click();

		// Panel reconciles: the mark-all-read action removes the unread items.
		await expect(
			page.getByRole("button", { name: /mark all read/i }),
		).toBeHidden();

		// Close the panel; the bell badge is refetched and should be gone.
		await page.keyboard.press("Escape");
		await expect(page.getByTestId("notifications-unread-dot")).toBeHidden();
	});
});
