import { expect, type Page, test } from "@playwright/test";

/**
 * E2E coverage for audit log pagination (issue #804).
 *
 * Invariants (see docs/team-access-and-audit-log.md#audit-log-pagination):
 *  - `/api/activity` is deny-by-default and validates every param before reading.
 *  - Cursor pagination walks every entry exactly once; cursors are bound to
 *    their filter set.
 *  - 429/503 keep already-loaded rows and gate the retry on Retry-After.
 *
 * The API specs run against the dev server's mock fallback (no backend
 * configured, see playwright.config.ts). The UI specs mock `/api/activity`
 * with `page.route` and skip when the page is not reachable.
 */

const ACTIVITY_PATH = "/dashboard/activity";
const AUTH = { authorization: "Bearer e2e-token" };

async function activityPageReady(page: Page): Promise<boolean> {
	await page.goto(ACTIVITY_PATH, { waitUntil: "domcontentloaded" });
	return page
		.getByTestId("audit-log")
		.isVisible()
		.catch(() => false);
}

function entry(index: number) {
	return {
		id: `evt_${String(index).padStart(4, "0")}`,
		actor: "member_admin",
		action: "wallet.send",
		createdAt: new Date(Date.UTC(2026, 0, 1) - index * 60_000).toISOString(),
		network: "testnet",
	};
}

test.describe("GET /api/activity", () => {
	test("rejects anonymous callers", async ({ request }) => {
		const res = await request.get("/api/activity");
		expect(res.status()).toBe(401);
		const body = await res.json();
		expect(body.error.code).toBe("unauthorized");
		expect(res.headers()["x-correlation-id"]).toBeTruthy();
	});

	test("rejects out-of-range limits and forged cursors", async ({
		request,
	}) => {
		const badLimit = await request.get("/api/activity?limit=1000", {
			headers: AUTH,
		});
		expect(badLimit.status()).toBe(400);
		expect((await badLimit.json()).error.code).toBe("invalid_filter");

		const forged = await request.get("/api/activity?cursor=AAAA", {
			headers: AUTH,
		});
		expect(forged.status()).toBe(400);
		expect((await forged.json()).error.code).toBe("invalid_cursor");
	});

	test("walks all pages without duplicates", async ({ request }) => {
		const ids: string[] = [];
		let cursor: string | null = null;
		for (let guard = 0; guard < 50; guard += 1) {
			const query: string = cursor ? `?limit=50&cursor=${cursor}` : "?limit=50";
			const res = await request.get(`/api/activity${query}`, { headers: AUTH });
			expect(res.status()).toBe(200);
			const body = await res.json();
			ids.push(...body.items.map((item: { id: string }) => item.id));
			cursor = body.nextCursor;
			if (!cursor) break;
		}
		expect(ids.length).toBeGreaterThan(0);
		expect(new Set(ids).size).toBe(ids.length);
	});

	test("replaying a cursor returns the same page", async ({ request }) => {
		const first = await (
			await request.get("/api/activity?limit=5", { headers: AUTH })
		).json();
		const url = `/api/activity?limit=5&cursor=${first.nextCursor}`;
		const a = await (await request.get(url, { headers: AUTH })).json();
		const b = await (await request.get(url, { headers: AUTH })).json();
		expect(a.items).toEqual(b.items);
	});
});

test.describe("activity page", () => {
	test("Load more appends the next page", async ({ page }) => {
		let calls = 0;
		await page.route("**/api/activity**", (route) => {
			calls += 1;
			const offset = calls === 1 ? 0 : 50;
			return route.fulfill({
				json: {
					items: Array.from({ length: 50 }, (_, i) => entry(offset + i)),
					nextCursor: calls === 1 ? "cursor_1" : null,
				},
			});
		});
		test.skip(!(await activityPageReady(page)), "activity page not reachable");

		await expect(page.getByTestId("audit-log-row")).toHaveCount(50);
		await page.getByTestId("audit-log-load-more").click();
		await expect(page.getByTestId("audit-log-row")).toHaveCount(100);
		await expect(page.getByTestId("audit-log-end")).toBeVisible();
	});

	test("429 keeps loaded rows and gates retry on Retry-After", async ({
		page,
	}) => {
		let calls = 0;
		await page.route("**/api/activity**", (route) => {
			calls += 1;
			if (calls === 1) {
				return route.fulfill({
					json: {
						items: Array.from({ length: 50 }, (_, i) => entry(i)),
						nextCursor: "cursor_1",
					},
				});
			}
			return route.fulfill({
				status: 429,
				headers: { "retry-after": "120", "x-correlation-id": "e2e-corr" },
				json: { error: { code: "rate_limited" } },
			});
		});
		test.skip(!(await activityPageReady(page)), "activity page not reachable");

		await expect(page.getByTestId("audit-log-row")).toHaveCount(50);
		await page.getByTestId("audit-log-load-more").click();
		await expect(page.getByTestId("rate-limit-notice")).toBeVisible();
		await expect(page.getByTestId("rate-limit-retry")).toBeDisabled();
		await expect(page.getByTestId("rate-limit-correlation-id")).toHaveText(
			"e2e-corr",
		);
		await expect(page.getByTestId("audit-log-row")).toHaveCount(50);
	});

	test("503 maintenance shows fixed copy, never server text", async ({
		page,
	}) => {
		await page.route("**/api/activity**", (route) =>
			route.fulfill({
				status: 503,
				headers: { "x-mux-maintenance": "true", "retry-after": "60" },
				json: { error: { code: "MAINTENANCE", message: "Visit evil.example" } },
			}),
		);
		test.skip(!(await activityPageReady(page)), "activity page not reachable");

		const notice = page.getByTestId("maintenance-notice");
		await expect(notice).toBeVisible();
		await expect(notice).toHaveAttribute("data-code", "MAINTENANCE");
		await expect(page.getByTestId("maintenance-retry")).toBeDisabled();
		await expect(page.locator("body")).not.toContainText("evil.example");
	});
});
