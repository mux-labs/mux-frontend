import { describe, expect, it } from "vitest";
import { mockWebhooks, webhookStats } from "../webhooks";

describe("mockWebhooks", () => {
	it("contains at least one webhook", () => {
		expect(mockWebhooks.length).toBeGreaterThan(0);
	});

	it("every webhook has required fields", () => {
		for (const wh of mockWebhooks) {
			expect(wh.id).toBeTruthy();
			expect(wh.event).toBeTruthy();
			expect(wh.url).toBeTruthy();
			expect(["delivered", "failed", "pending"]).toContain(wh.status);
			expect(wh.createdAt).toBeInstanceOf(Date);
			expect(typeof wh.attempts).toBe("number");
		}
	});

	it("failed webhooks have a responseCode that is not 2xx", () => {
		const failed = mockWebhooks.filter((w) => w.status === "failed");
		for (const wh of failed) {
			expect(wh.responseCode).toBeDefined();
			expect(wh.responseCode).toBeGreaterThanOrEqual(400);
		}
	});

	it("delivered webhooks have a 2xx responseCode", () => {
		const delivered = mockWebhooks.filter((w) => w.status === "delivered");
		for (const wh of delivered) {
			expect(wh.responseCode).toBeDefined();
			expect(wh.responseCode).toBeGreaterThanOrEqual(200);
			expect(wh.responseCode).toBeLessThan(300);
		}
	});

	it("pending webhooks have zero attempts", () => {
		const pending = mockWebhooks.filter((w) => w.status === "pending");
		for (const wh of pending) {
			expect(wh.attempts).toBe(0);
		}
	});
});

describe("webhookStats", () => {
	it("total equals the length of mockWebhooks", () => {
		expect(webhookStats.total).toBe(mockWebhooks.length);
	});

	it("failed count matches actual failed webhooks", () => {
		const actualFailed = mockWebhooks.filter(
			(w) => w.status === "failed",
		).length;
		expect(webhookStats.failed).toBe(actualFailed);
	});

	it("delivered count matches actual delivered webhooks", () => {
		const actualDelivered = mockWebhooks.filter(
			(w) => w.status === "delivered",
		).length;
		expect(webhookStats.delivered).toBe(actualDelivered);
	});

	it("pending count matches actual pending webhooks", () => {
		const actualPending = mockWebhooks.filter(
			(w) => w.status === "pending",
		).length;
		expect(webhookStats.pending).toBe(actualPending);
	});

	it("failed + delivered + pending equals total", () => {
		expect(webhookStats.failed + webhookStats.delivered + webhookStats.pending).toBe(
			webhookStats.total,
		);
	});
});
