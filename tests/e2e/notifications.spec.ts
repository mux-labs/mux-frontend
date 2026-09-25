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

test.describe("Notification preferences page (#865)", () => {
	test("renders the preferences page with channel and event toggles", async ({
		page,
	}) => {
		await signIn(page);

		await page.goto("/dashboard/settings/notifications");

		await expect(
			page.getByRole("heading", { name: /notification preferences/i }),
		).toBeVisible();

		// Channel toggles are present and reflect the seeded preference state.
		await expect(
			page.getByTestId("pref-channel-email"),
		).toBeVisible();
		await expect(
			page.getByTestId("pref-channel-push"),
		).toBeVisible();

		// Event toggles are present for the money/realtime paths.
		await expect(
			page.getByTestId("pref-event-transaction"),
		).toBeVisible();
		await expect(
			page.getByTestId("pref-event-security"),
		).toBeVisible();
	});

	test("updates a preference and persists it across reload", async ({
		page,
	}) => {
		await signIn(page);
		await page.goto("/dashboard/settings/notifications");

		const emailToggle = page.getByTestId("pref-channel-email");
		await expect(emailToggle).toBeVisible();

		const wasChecked = await emailToggle.isChecked();
		await emailToggle.click();

		// Save is idempotent: the write is keyed and the UI reconciles.
		await page.getByTestId("pref-save").click();
		await expect(page.getByTestId("pref-saved")).toBeVisible();

		await page.reload();
		await expect(emailToggle).toBeVisible();
		await expect(emailToggle).toBeChecked({ checked: !wasChecked });
	});

	test("denies unauthenticated access to the preferences page", async ({
		page,
	}) => {
		await page.goto("/dashboard/settings/notifications");

		// Auth-gated route: middleware redirects to login, deny-by-default.
		await page.waitForURL("**/login**");
		await expect(
			page.getByRole("heading", { name: /notification preferences/i }),
		).toBeHidden();
	});
});
