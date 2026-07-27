import { describe, expect, it } from "vitest";
import { GET, PATCH, POST } from "@/app/api/api-keys/route";
import { mockApiKeys } from "@/mock-data/api-keys";

describe("GET /api/api-keys", () => {
	it("returns a list of API keys", async () => {
		const res = await GET();
		const json = await res.json();

		expect(json.data).toEqual(expect.arrayContaining(mockApiKeys));
	});

	it("creates an API key with a one-time secret", async () => {
		const res = await POST(
			new Request("http://localhost/api/api-keys", {
				method: "POST",
				body: JSON.stringify({ name: "Production" }),
			}),
		);
		const json = await res.json();

		expect(res.status).toBe(201);
		expect(json.data).toEqual(
			expect.objectContaining({
				name: "Production",
				status: "Active",
				secret: expect.stringMatching(/^mux_sk_/),
				key: expect.stringContaining("••••"),
			}),
		);
	});

	it("rejects API key creation without a name", async () => {
		const res = await POST(
			new Request("http://localhost/api/api-keys", {
				method: "POST",
				body: JSON.stringify({ name: " " }),
			}),
		);

		expect(res.status).toBe(400);
	});

	it("revokes an API key", async () => {
		const res = await PATCH(
			new Request("http://localhost/api/api-keys", {
				method: "PATCH",
				body: JSON.stringify({ id: "1", action: "revoke" }),
			}),
		);
		const json = await res.json();

		expect(json.data).toEqual(
			expect.objectContaining({ id: "1", status: "Revoked" }),
		);
	});
});
