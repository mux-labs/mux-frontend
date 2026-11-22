import { describe, expect, it } from "vitest";
import { applySettings } from "./settings-store";

describe("applySettings", () => {
	it("creates the record on first write", async () => {
		const record = await applySettings("wallet_create", { label: "Treasury" }, "user_1");

		expect(record).toMatchObject({
			walletId: "wallet_create",
			label: "Treasury",
			updatedBy: "user_1",
		});
		expect(typeof record.updatedAt).toBe("string");
		expect(Number.isNaN(Date.parse(record.updatedAt))).toBe(false);
	});

	it("merges the update into the stored settings and persists the result", async () => {
		await applySettings("wallet_merge", { label: "Old", allowDirectSpend: false }, "user_1");

		const merged = await applySettings("wallet_merge", { label: "New" }, "user_2");

		// Fields absent from the update are preserved from the stored record.
		expect(merged).toMatchObject({
			walletId: "wallet_merge",
			label: "New",
			allowDirectSpend: false,
			updatedBy: "user_2",
		});

		// The merged result is persisted: a later read-only update sees it.
		const reread = await applySettings("wallet_merge", {}, "user_3");
		expect(reread.label).toBe("New");
		expect(reread.allowDirectSpend).toBe(false);
	});

	it("keeps records isolated per walletId", async () => {
		await applySettings("wallet_a", { label: "A" }, "user_1");
		await applySettings("wallet_b", { label: "B" }, "user_1");

		const a = await applySettings("wallet_a", {}, "user_1");
		const b = await applySettings("wallet_b", {}, "user_1");

		expect(a.label).toBe("A");
		expect(b.label).toBe("B");
	});

	it("fails when the backing Map stops persisting writes", async () => {
		// Failure path: if the store stops writing to the Map (e.g. the
		// `records.set` call is removed), the second call must not see the
		// first write. This assertion fails if that behavior is removed.
		await applySettings("wallet_fail", { label: "Persisted" }, "user_1");

		const reread = await applySettings("wallet_fail", {}, "user_2");

		expect(reread.label).toBe("Persisted");
	});
});
