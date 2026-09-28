import { expect, test } from "@playwright/test";

/**
 * E2E coverage for feature-flagged send flows (issue #803).
 *
 * The Playwright dev server sets no `MUX_SEND_*` flags and no backend, so
 * these specs assert the deny-by-default posture of the real route: sends
 * are refused before any backend call, and client-side hints (headers,
 * NEXT_PUBLIC_* flags) cannot unlock them. Enabled-path behaviour (backend
 * proxying, maintenance/429 mapping, idempotency) is covered by
 * `src/app/api/transactions/send/route.test.ts`.
 */

const SEND_API = "/api/transactions/send";
const BODY = {
	walletId: "wallet_1",
	destination: `G${"A".repeat(55)}`,
	amount: "1",
	asset: "native",
	network: "testnet",
};

test.describe("POST /api/transactions/send (flags off)", () => {
	test("anonymous sends are rejected", async ({ request }) => {
		const res = await request.post(SEND_API, { data: BODY });
		expect(res.status()).toBe(401);
		expect((await res.json()).error.code).toBe("SEND_UNAUTHORIZED");
		expect(res.headers()["x-correlation-id"]).toBeTruthy();
	});

	test("authenticated sends are refused while the flag is off", async ({
		request,
	}) => {
		const res = await request.post(SEND_API, {
			data: BODY,
			headers: {
				authorization: "Bearer e2e-token",
				"idempotency-key": "e2e_idempotency_key_0001",
				// Client-supplied hints must not unlock the gate.
				"x-role": "owner",
				"x-feature-send": "true",
			},
		});
		expect([403, 503]).toContain(res.status());
		expect((await res.json()).error.code).toMatch(
			/^SEND_(DISABLED|KILL_SWITCH_ENGAGED|NETWORK_MISCONFIGURED)$/,
		);
	});

	test("cookie-only cross-origin sends are rejected (CSRF)", async ({
		request,
	}) => {
		const res = await request.post(SEND_API, {
			data: BODY,
			headers: { cookie: "mux_session=e2e", origin: "https://evil.example" },
		});
		expect(res.status()).toBe(403);
	});
});
