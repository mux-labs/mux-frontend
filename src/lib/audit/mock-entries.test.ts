import { describe, expect, it } from "vitest";
import { MOCK_AUDIT_ENTRIES, MOCK_AUDIT_ENTRY_COUNT } from "./mock-entries";
import { getBackendBaseUrl, isMockFallbackAllowed } from "@/lib/http/backend-url";

describe("MOCK_AUDIT_ENTRIES", () => {
	it("has exactly MOCK_AUDIT_ENTRY_COUNT entries", () => {
		expect(MOCK_AUDIT_ENTRIES.length).toBe(MOCK_AUDIT_ENTRY_COUNT);
	});

	it("has unique, zero-padded ids", () => {
		const ids = MOCK_AUDIT_ENTRIES.map((entry) => entry.id);
		expect(new Set(ids).size).toBe(MOCK_AUDIT_ENTRY_COUNT);
		for (const id of ids) {
			expect(id).toMatch(/^evt_\d{4}$/);
		}
	});

	it("anchors the first entry's timestamp to the documented epoch", () => {
		expect(MOCK_AUDIT_ENTRIES[0].createdAt).toBe(new Date(Date.UTC(2026, 0, 1)).toISOString());
	});

	it("shares a createdAt timestamp between at least one adjacent pair, exercising the id tie-break", () => {
		const hasTieBreakPair = MOCK_AUDIT_ENTRIES.some(
			(entry, i) => i + 1 < MOCK_AUDIT_ENTRIES.length && entry.createdAt === MOCK_AUDIT_ENTRIES[i + 1].createdAt,
		);
		expect(hasTieBreakPair).toBe(true);
	});

	it("uses deterministic fixed-epoch timestamps in UTC, one hour apart per slot", () => {
		const anchorMs = Date.UTC(2026, 0, 1);
		const stepMs = 60 * 60 * 1000;
		MOCK_AUDIT_ENTRIES.forEach((entry, index) => {
			const slot = index % 4 === 1 ? index - 1 : index;
			expect(entry.createdAt).toBe(new Date(anchorMs + slot * stepMs).toISOString());
			expect(entry.createdAt.endsWith("Z")).toBe(true);
		});
	});

	it("shares a timestamp for every fourth pair (indices 1/2, 5/6, ...) and nowhere else", () => {
		MOCK_AUDIT_ENTRIES.forEach((entry, index) => {
			if (index === 0) return;
			const previous = MOCK_AUDIT_ENTRIES[index - 1];
			const shouldShare = index % 4 === 1;
			expect(entry.createdAt === previous.createdAt).toBe(shouldShare);
		});
	});

	it("is stable across reads (no wall-clock dependence)", () => {
		const snapshot = MOCK_AUDIT_ENTRIES.map((entry) => entry.createdAt);
		expect(MOCK_AUDIT_ENTRIES.map((entry) => entry.createdAt)).toEqual(snapshot);
		expect(snapshot[0]).toBe("2026-01-01T00:00:00.000Z");
	});
});

describe("mock-fallback gating for the audit fixture", () => {
	it("only serves MOCK_AUDIT_ENTRIES when the gate allows it", () => {
		const gate = (env: Record<string, string | undefined>) =>
			getBackendBaseUrl(env) === null && isMockFallbackAllowed(env);

		expect(gate({ NEXT_PUBLIC_NETWORK: "testnet" })).toBe(true);
		expect(gate({ NEXT_PUBLIC_NETWORK: "testnet", NEXT_PUBLIC_BACKEND_URL: "https://api.example.com" })).toBe(false);
		expect(gate({})).toBe(false);
		expect(gate({ NEXT_PUBLIC_NETWORK: "mainnet" })).toBe(false);
	});
});
