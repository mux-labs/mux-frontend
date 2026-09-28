import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST, redactEmail } from "./route";

const PASSWORD = "hunter2-super-secret";
const TOKEN = "jwt.secret.token";

function loginRequest(body: unknown) {
	return new Request("http://localhost/api/auth/login", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/auth/login", () => {
	let logs: string[];

	beforeEach(() => {
		logs = [];
		vi.spyOn(console, "info").mockImplementation((msg: string) => logs.push(msg));
		process.env.MUX_AUTH_URL = "https://auth.test";
	});

	afterEach(() => {
		vi.restoreAllMocks();
		delete process.env.MUX_AUTH_URL;
	});

	it("rejects invalid bodies with a stable code", async () => {
		const res = await POST(loginRequest({ email: "nope" }));
		expect(res.status).toBe(400);
		expect((await res.json()).error.code).toBe("AUTH_LOGIN_INVALID_BODY");
	});

	it("never logs the password or token on success", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ token: TOKEN })));
		const res = await POST(loginRequest({ email: "alice@mux.io", password: PASSWORD }));
		expect(res.status).toBe(200);
		const joined = logs.join("\n");
		expect(joined).not.toContain(PASSWORD);
		expect(joined).not.toContain(TOKEN);
		expect(joined).not.toContain("alice@mux.io");
	});

	it("never logs the password on invalid credentials", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 401 }));
		const res = await POST(loginRequest({ email: "alice@mux.io", password: PASSWORD }));
		expect(res.status).toBe(401);
		expect(logs.join("\n")).not.toContain(PASSWORD);
	});

	it("fails closed when the upstream is unavailable", async () => {
		vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error(`boom ${PASSWORD}`));
		const res = await POST(loginRequest({ email: "alice@mux.io", password: PASSWORD }));
		expect(res.status).toBe(503);
		expect(res.headers.get("set-cookie")).toBeNull();
		expect(logs.join("\n")).not.toContain(PASSWORD);
	});

	it("masks emails", () => {
		expect(redactEmail("alice@mux.io")).toBe("a***@mux.io");
		expect(redactEmail("bad")).toBe("[redacted]");
	});
});
