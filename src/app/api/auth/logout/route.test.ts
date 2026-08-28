import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/auth/logout (#622)", () => {
	it("returns 200 and expires the session cookie", async () => {
		const res = await POST();
		expect(res.status).toBe(200);

		const setCookie = res.headers.get("set-cookie") ?? "";
		expect(setCookie).toContain("mux_auth_session=");
		expect(setCookie.toLowerCase()).toContain("max-age=0");
		expect(setCookie.toLowerCase()).toContain("httponly");
	});
});
