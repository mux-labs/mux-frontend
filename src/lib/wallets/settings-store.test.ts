import { beforeEach, describe, expect, it, vi } from "vitest";

import { __resetSettingsStore, applySettings } from "./settings-store";

describe("applySettings", () => {
	beforeEach(() => {
		__resetSettingsStore();
		vi.useRealTimers();
	});

	it("creates the record on first write", async () => {
		const record = await applySettings(
			"wallet_1",
			{ label: "Treasury" },
			"user_1",
		);

		expect(record).toMatchObject({
			walletId: "wallet_1",
			label: "Treasury",
			updatedBy: "user_1",
		});
		expect(typeof record.updatedAt).toBe("string");
		expect(Number.isNaN(Date.parse(record.updatedAt))).toBe(false);
	});

	it("merges the update into the stored settings and persists the result", async () => {
		await applySettings(
			"wallet_1",
			{ label: "Treasury", allowDirectSpend: false },
			"user_1",
		);

		const merged = await applySettings(
			"wallet_1",
			{ allowDirectSpend: true },
			"user_2",
		);

		expect(merged).toMatchObject({
			walletId: "wallet_1",
			label: "Treasury",
			allowDirectSpend: true,
			updatedBy: "user_2",
		});

		// Persisted: a later write with an empty update still sees the merge.
		const persisted = await applySettings("wallet_1", {}, "user_3");
		expect(persisted).toMatchObject({
			label: "Treasury",
			allowDirectSpend: true,
			updatedBy: "user_3",
		});
	});

	it("keeps records isolated per walletId", async () => {
		await applySettings("wallet_1", { label: "One" }, "user_1");
		await applySettings("wallet_2", { label: "Two" }, "user_1");

		const one = await applySettings("wallet_1", {}, "user_2");
		const two = await applySettings("wallet_2", {}, "user_2");

		expect(one.label).toBe("One");
		expect(two.label).toBe("Two");
	});

	it("stamps a fresh updatedAt on every write", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const first = await applySettings("wallet_1", { label: "A" }, "user_1");

		vi.setSystemTime(new Date("2026-01-01T00:00:05.000Z"));
		const second = await applySettings("wallet_1", { label: "B" }, "user_1");

		expect(first.updatedAt).toBe("2026-01-01T00:00:00.000Z");
		expect(second.updatedAt).toBe("2026-01-01T00:00:05.000Z");
	});

	it("rejects and leaves the stored record untouched when the write fails", async () => {
		await applySettings("wallet_1", { label: "Treasury" }, "user_1");

		const setSpy = vi
			.spyOn(Map.prototype, "set")
			.mockImplementationOnce(() => {
				throw new Error("store unavailable");
			});

		try {
			await expect(
				applySettings("wallet_1", { label: "Hijacked" }, "user_2"),
			).rejects.toThrow("store unavailable");
		} finally {
			setSpy.mockRestore();
		}

		const persisted = await applySettings("wallet_1", {}, "user_3");
		expect(persisted.label).toBe("Treasury");
	});
});
