import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "./route";

describe("/api/wallets/[id]", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	it("returns a wallet when the id exists", async () => {
		const response = await GET(
			new Request("http://localhost/api/wallets/wallet-001"),
			{
				params: {
					id: "wallet-001",
				},
			},
		);

		expect(response.status).toBe(200);

		const body = await response.json();
		expect(body).toMatchObject({
			id: "wallet-001",
			address: expect.any(String),
			network: expect.any(String),
			status: expect.any(String),
		});
	});

	it("returns 404 when the wallet is missing", async () => {
		const response = await GET(
			new Request("http://localhost/api/wallets/missing"),
			{
				params: {
					id: "missing",
				},
			},
		);

		expect(response.status).toBe(404);
		await expect(response.json()).resolves.toEqual({ error: "not_found" });
	});

	it("updates a wallet nickname", async () => {
		const response = await PATCH(
			new Request("http://localhost/api/wallets/wallet-001", {
				method: "PATCH",
				body: JSON.stringify({ label: "Treasury" }),
			}),
			{ params: { id: "wallet-001" } },
		);
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({ label: "Treasury" });
	});

	it("rejects an invalid wallet nickname", async () => {
		const response = await PATCH(
			new Request("http://localhost/api/wallets/wallet-001", {
				method: "PATCH",
				body: JSON.stringify({ label: "<script>" }),
			}),
			{ params: { id: "wallet-001" } },
		);
		expect(response.status).toBe(422);
	});

	it("archives a wallet", async () => {
		const response = await PATCH(
			new Request("http://localhost/api/wallets/wallet-002", {
				method: "PATCH",
				body: JSON.stringify({ archived: true }),
			}),
			{ params: { id: "wallet-002" } },
		);
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({ archived: true });
	});

	it("rejects a non-boolean archived value", async () => {
		const response = await PATCH(
			new Request("http://localhost/api/wallets/wallet-002", {
				method: "PATCH",
				body: JSON.stringify({ archived: "yes" }),
			}),
			{ params: { id: "wallet-002" } },
		);
		expect(response.status).toBe(400);
	});

	describe("production without a configured backend", () => {
		it("returns 503 instead of serving mock wallet data on GET", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "");
			vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "");
			vi.stubEnv("NEXT_PUBLIC_API_BASE", "");
			vi.stubEnv("NODE_ENV", "production");

			const response = await GET(
				new Request("http://localhost/api/wallets/wallet-001"),
				{ params: { id: "wallet-001" } },
			);

			expect(response.status).toBe(503);
			const body = await response.json();
			expect(body.error).toBe("backend_unavailable");
		});

		it("returns 503 instead of mutating mock wallet data on PATCH", async () => {
			vi.stubEnv("NEXT_PUBLIC_API_URL", "");
			vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "");
			vi.stubEnv("NEXT_PUBLIC_API_BASE", "");
			vi.stubEnv("NODE_ENV", "production");

			const response = await PATCH(
				new Request("http://localhost/api/wallets/wallet-001", {
					method: "PATCH",
					body: JSON.stringify({ label: "Treasury" }),
				}),
				{ params: { id: "wallet-001" } },
			);

			expect(response.status).toBe(503);
			const body = await response.json();
			expect(body.error).toBe("backend_unavailable");
		});
	});
});
