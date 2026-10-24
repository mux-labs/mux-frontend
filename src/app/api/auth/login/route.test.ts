import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SESSION_MAX_AGE_SECONDS, POST, redactEmail } from "./route";

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
		vi.spyOn(console, "info").mockImplementation((msg: string) =>
			logs.push(msg),
		);
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
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ token: TOKEN })),
		);
		const res = await POST(
			loginRequest({ email: "alice@mux.io", password: PASSWORD }),
		);
		expect(res.status).toBe(200);
		expect(res.headers.get("set-cookie")).toContain(TOKEN);
		const joined = logs.join("\n");
		expect(joined).not.toContain(PASSWORD);
		expect(joined).not.toContain(TOKEN);
		expect(joined).not.toContain("alice@mux.io");
	});

	it("sets the cookie maxAge from the upstream expiresIn", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ token: TOKEN, expiresIn: 900 })),
		);
		const res = await POST(
			loginRequest({ email: "alice@mux.io", password: PASSWORD }),
		);
		expect(res.status).toBe(200);
		expect(res.cookies.get("mux_session")?.maxAge).toBe(900);
	});

	it("sets the cookie maxAge from the upstream expires_in", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ token: TOKEN, expires_in: 1200 })),
		);
		const res = await POST(
			loginRequest({ email: "alice@mux.io", password: PASSWORD }),
		);
		expect(res.status).toBe(200);
		expect(res.cookies.get("mux_session")?.maxAge).toBe(1200);
	});

	it("falls back to the default maxAge when the upstream has no lifetime", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ token: TOKEN })),
		);
		const res = await POST(
			loginRequest({ email: "alice@mux.io", password: PASSWORD }),
		);
		expect(res.status).toBe(200);
		const maxAge = res.cookies.get("mux_session")?.maxAge;
		expect(maxAge).toBe(DEFAULT_SESSION_MAX_AGE_SECONDS);
		expect(maxAge).toBeGreaterThan(0);
	});

	it("falls back to the default maxAge when the upstream lifetime is invalid", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ token: TOKEN, expiresIn: -5 })),
		);
		const res = await POST(
			loginRequest({ email: "alice@mux.io", password: PASSWORD }),
		);
		expect(res.status).toBe(200);
		expect(res.cookies.get("mux_session")?.maxAge).toBe(
			DEFAULT_SESSION_MAX_AGE_SECONDS,
		);
	});

	it("maps an upstream 429 to a stable error code without echoing the upstream body", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(null, { status: 429 }),
		);
		const res = await POST(
			loginRequest({ email: "alice@mux.io", password: PASSWORD }),
		);
		expect(res.status).toBe(503);
		const body = await res.json();
		expect(body.error.code).toBe("AUTH_LOGIN_UPSTREAM_UNAVAILABLE");
		expect(JSON.stringify(body)).not.toContain("429");
	});

	it("maps an upstream 500 to a stable 5xx error code without echoing the upstream body", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(null, { status: 500 }),
		);
		const res = await POST(
			loginRequest({ email: "alice@mux.io", password: PASSWORD }),
		);
		expect(res.status).toBeGreaterThanOrEqual(500);
		const body = await res.json();
		expect(body.error.code).toBe("AUTH_LOGIN_UPSTREAM_UNAVAILABLE");
	});

	it("fails closed when the upstream 200 body is not JSON", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response("not json", { status: 200 }),
		);
		const res = await POST(
			loginRequest({ email: "alice@mux.io", password: PASSWORD }),
		);
		expect(res.status).not.toBe(200);
		const body = await res.json();
		expect(body.error.code).toBeDefined();
	});

	it("does not return 200 with an undefined token when the upstream body has none", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({}), { status: 200 }),
		);
		const res = await POST(
			loginRequest({ email: "alice@mux.io", password: PASSWORD }),
		);
		expect(res.status).not.toBe(200);
		expect(res.headers.get("set-cookie")).toBeNull();
		const body = await res.json();
		expect(body.error.code).toBeDefined();
	});

	it("never logs the password on invalid credentials", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(null, { status: 401 }),
		);
		const res = await POST(
			loginRequest({ email: "alice@mux.io", password: PASSWORD }),
		);
		expect(res.status).toBe(401);
		expect(logs.join("\n")).not.toContain(PASSWORD);
	});

	it("fails closed when the upstream is unavailable", async () => {
		vi.spyOn(globalThis, "fetch").mockRejectedValue(
			new Error(`boom ${PASSWORD}`),
		);
		const res = await POST(
			loginRequest({ email: "alice@mux.io", password: PASSWORD }),
		);
		expect(res.status).toBe(503);
		expect(res.headers.get("set-cookie")).toBeNull();
		expect(logs.join("\n")).not.toContain(PASSWORD);
	});
});

describe("redactEmail", () => {
	it("masks both the local part and domain", () => {
		const redacted = redactEmail("alice@acme-corp.com");
		expect(redacted).toBe("a***@[redacted-domain]");
		expect(redacted).not.toContain("alice");
		expect(redacted).not.toContain("acme-corp.com");
	});

	it("returns a fixed placeholder for malformed input", () => {
		expect(redactEmail("not-an-email")).toBe("[redacted]");
	});

	it("returns a fixed placeholder for an empty string", () => {
		expect(redactEmail("")).toBe("[redacted]");
	});
});
