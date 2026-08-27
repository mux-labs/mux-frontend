import { describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken } from "../sessionToken";

const SECRET = "test-secret-value-32-chars-long!!";

describe("sessionToken (#622)", () => {
	it("round-trips: a freshly signed token verifies and returns its claims", async () => {
		const token = await signSessionToken(
			{ sub: "jane@example.com", role: "developer" },
			SECRET,
		);
		const claims = await verifySessionToken(token, SECRET);

		expect(claims).not.toBeNull();
		expect(claims?.sub).toBe("jane@example.com");
		expect(claims?.role).toBe("developer");
		expect(claims?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
	});

	it("rejects a token signed with a different secret", async () => {
		const token = await signSessionToken({ sub: "a@b.com" }, SECRET);
		expect(await verifySessionToken(token, "some-other-secret")).toBeNull();
	});

	it("rejects a tampered payload", async () => {
		const token = await signSessionToken(
			{ sub: "a@b.com", role: "user" },
			SECRET,
		);
		const [header, , signature] = token.split(".");
		const forgedPayload = btoa(
			JSON.stringify({
				sub: "a@b.com",
				role: "admin",
				iat: 0,
				exp: 9999999999,
			}),
		)
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "");
		expect(
			await verifySessionToken(
				`${header}.${forgedPayload}.${signature}`,
				SECRET,
			),
		).toBeNull();
	});

	it("rejects an expired token", async () => {
		const token = await signSessionToken({ sub: "a@b.com" }, SECRET, -10);
		expect(await verifySessionToken(token, SECRET)).toBeNull();
	});

	it("returns null (never throws) for malformed input", async () => {
		expect(await verifySessionToken("not-a-jwt", SECRET)).toBeNull();
		expect(await verifySessionToken("", SECRET)).toBeNull();
		expect(await verifySessionToken(undefined, SECRET)).toBeNull();
		expect(await verifySessionToken("a.b.c", SECRET)).toBeNull();
	});
});
