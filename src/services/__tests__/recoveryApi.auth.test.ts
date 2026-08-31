/**
 * Failing tests: recoveryApi must send Authorization headers and use
 * fetchWithAuth for 401 handling — matching the pattern in useWallets.ts.
 *
 * These tests assert the auth headers are attached to every request made by
 * fetchRecoveryStatus, fetchRecoveryEvents, and initiateRecovery. They fail
 * on the current code because recoveryApi only sends Content-Type.
 */
import { vi } from "vitest";
import { mockRecoveryTimelineCompleted } from "@/mock-data/recovery";

// Spy on fetchWithAuth — the recovery module must call it instead of raw fetch
vi.mock("@/utils/fetchWithAuth", () => ({
	fetchWithAuth: vi.fn(),
}));

// Spy on loadSession — the recovery module must read the bearer token from here
vi.mock("@/lib/session", () => ({
	loadSession: vi.fn(),
}));

import { loadSession } from "@/lib/session";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
	fetchRecoveryEvents,
	fetchRecoveryStatus,
	initiateRecovery,
} from "../recoveryApi";

const mockFetch = vi.mocked(fetchWithAuth);
const mockLoadSession = vi.mocked(loadSession);

function okResponse(body: unknown) {
	return {
		ok: true,
		status: 200,
		json: async () => body,
	} as Response;
}

describe("recoveryApi — auth headers", () => {
	const fakeToken = "test-access-token-abc123";

	beforeEach(() => {
		vi.clearAllMocks();
		mockLoadSession.mockReturnValue({
			accessToken: fakeToken,
			refreshToken: "r",
			expiresAt: Date.now() + 60_000,
		});
	});

	describe("fetchRecoveryStatus", () => {
		it("must use fetchWithAuth instead of raw fetch", async () => {
			mockFetch.mockResolvedValueOnce(
				okResponse({
					...mockRecoveryTimelineCompleted,
					startedAt: mockRecoveryTimelineCompleted.startedAt.toISOString(),
					completedAt: mockRecoveryTimelineCompleted.completedAt?.toISOString(),
					events: mockRecoveryTimelineCompleted.events.map((e) => ({
						...e,
						timestamp: e.timestamp.toISOString(),
					})),
				}),
			);

			await fetchRecoveryStatus("wallet-123");

			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it("must include Authorization header from loadSession", async () => {
			mockFetch.mockResolvedValueOnce(
				okResponse({
					...mockRecoveryTimelineCompleted,
					startedAt: mockRecoveryTimelineCompleted.startedAt.toISOString(),
					completedAt: mockRecoveryTimelineCompleted.completedAt?.toISOString(),
					events: mockRecoveryTimelineCompleted.events.map((e) => ({
						...e,
						timestamp: e.timestamp.toISOString(),
					})),
				}),
			);

			await fetchRecoveryStatus("wallet-123");

			const [, init] = mockFetch.mock.calls[0];
			const headers = new Headers(init?.headers);
			expect(headers.get("Authorization")).toBe(`Bearer ${fakeToken}`);
		});

		it("must include Content-Type header", async () => {
			mockFetch.mockResolvedValueOnce(
				okResponse({
					...mockRecoveryTimelineCompleted,
					startedAt: mockRecoveryTimelineCompleted.startedAt.toISOString(),
					completedAt: mockRecoveryTimelineCompleted.completedAt?.toISOString(),
					events: mockRecoveryTimelineCompleted.events.map((e) => ({
						...e,
						timestamp: e.timestamp.toISOString(),
					})),
				}),
			);

			await fetchRecoveryStatus("wallet-123");

			const [, init] = mockFetch.mock.calls[0];
			const headers = new Headers(init?.headers);
			expect(headers.get("Content-Type")).toBe("application/json");
		});

		it("must omit Authorization when no session exists", async () => {
			mockLoadSession.mockReturnValue(null);
			mockFetch.mockResolvedValueOnce(
				okResponse({
					...mockRecoveryTimelineCompleted,
					startedAt: mockRecoveryTimelineCompleted.startedAt.toISOString(),
					completedAt: mockRecoveryTimelineCompleted.completedAt?.toISOString(),
					events: mockRecoveryTimelineCompleted.events.map((e) => ({
						...e,
						timestamp: e.timestamp.toISOString(),
					})),
				}),
			);

			await fetchRecoveryStatus("wallet-123");

			const [, init] = mockFetch.mock.calls[0];
			const headers = new Headers(init?.headers);
			expect(headers.get("Authorization")).toBeNull();
		});
	});

	describe("fetchRecoveryEvents", () => {
		it("must use fetchWithAuth instead of raw fetch", async () => {
			const mockEvents = mockRecoveryTimelineCompleted.events.map((e) => ({
				...e,
				timestamp: e.timestamp.toISOString(),
			}));

			mockFetch.mockResolvedValueOnce(okResponse(mockEvents));

			await fetchRecoveryEvents("recovery-123");

			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it("must include Authorization header from loadSession", async () => {
			const mockEvents = mockRecoveryTimelineCompleted.events.map((e) => ({
				...e,
				timestamp: e.timestamp.toISOString(),
			}));

			mockFetch.mockResolvedValueOnce(okResponse(mockEvents));

			await fetchRecoveryEvents("recovery-123");

			const [, init] = mockFetch.mock.calls[0];
			const headers = new Headers(init?.headers);
			expect(headers.get("Authorization")).toBe(`Bearer ${fakeToken}`);
		});
	});

	describe("initiateRecovery", () => {
		it("must use fetchWithAuth instead of raw fetch", async () => {
			mockFetch.mockResolvedValueOnce(
				okResponse({ recoveryId: "recovery-new-1" }),
			);

			await initiateRecovery("wallet-123");

			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it("must include Authorization header from loadSession", async () => {
			mockFetch.mockResolvedValueOnce(
				okResponse({ recoveryId: "recovery-new-1" }),
			);

			await initiateRecovery("wallet-123");

			const [, init] = mockFetch.mock.calls[0];
			const headers = new Headers(init?.headers);
			expect(headers.get("Authorization")).toBe(`Bearer ${fakeToken}`);
		});
	});
});
