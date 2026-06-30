import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("/api/wallets/[id]", () => {
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
});
