// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DESTINATION = `G${"A".repeat(55)}`;
const IDEMPOTENCY_KEY = "idem_0123456789abcdef";
const VALID_BODY = {
	walletId: "wallet_1",
	destination: DESTINATION,
	amount: "1.5",
	asset: "native",
	network: "testnet",
};

type Handler = (request: Request) => Promise<Response>;

// Fresh module per test so the in-process limiter/in-flight state is isolated.
async function loadPost(): Promise<Handler> {
	vi.resetModules();
	return (await import("./route")).POST as Handler;
}

function sendRequest(
	body: unknown = VALID_BODY,
	headers: Record<string, string> = {},
): Request {
	return new Request("http://localhost:3000/api/transactions/send", {
		method: "POST",
		headers: {
			authorization: "Bearer test-token",
			"idempotency-key": IDEMPOTENCY_KEY,
			"content-type": "application/json",
			...headers,
		},
		body: typeof body === "string" ? body : JSON.stringify(body),
	});
}

async function errorCode(response: Response): Promise<string> {
	return ((await response.json()) as { error: { code: string } }).error.code;
}

const upstream = vi.fn<typeof fetch>();

beforeEach(() => {
	vi.stubEnv("MUX_SEND_FLOWS_ENABLED", "true");
	vi.stubEnv("MUX_SEND_KILL_SWITCH", "");
	vi.stubEnv("MUX_SEND_MAINNET_ENABLED", "");
	vi.stubEnv("MUX_STELLAR_NETWORK", "testnet");
	vi.stubEnv("MUX_BACKEND_URL", "https://backend.test");
	vi.stubGlobal("fetch", upstream);
	vi.spyOn(console, "info").mockImplementation(() => undefined);
	upstream.mockReset();
	// Fresh Response per call: a body can only be consumed once.
	upstream.mockImplementation(async () =>
		Response.json({ id: "tx_1", status: "pending" }, { status: 201 }),
	);
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("POST /api/transactions/send — authz", () => {
	it("rejects anonymous requests before touching the backend", async () => {
		const POST = await loadPost();
		const res = await POST(sendRequest(VALID_BODY, { authorization: "" }));
		expect(res.status).toBe(401);
		expect(await errorCode(res)).toBe("SEND_UNAUTHORIZED");
		expect(res.headers.get("x-correlation-id")).toBeTruthy();
		expect(upstream).not.toHaveBeenCalled();
	});

	it("rejects a cookie-only request without a same-origin Origin (CSRF)", async () => {
		const POST = await loadPost();
		const res = await POST(
			sendRequest(VALID_BODY, {
				authorization: "",
				cookie: "mux_session=abc",
				origin: "https://evil.example",
			}),
		);
		expect(res.status).toBe(403);
		expect(upstream).not.toHaveBeenCalled();
	});

	it("accepts a same-origin cookie session and forwards only mux_session", async () => {
		const POST = await loadPost();
		const res = await POST(
			sendRequest(VALID_BODY, {
				authorization: "",
				cookie: "other=1; mux_session=abc",
				origin: "http://localhost:3000",
			}),
		);
		expect(res.status).toBe(201);
		const headers = upstream.mock.calls[0][1]?.headers as Record<
			string,
			string
		>;
		expect(headers.cookie).toBe("mux_session=abc");
	});

	it.each([
		[401, { error: { code: "token_expired" } }, "SEND_AUTH_EXPIRED"],
		[401, {}, "SEND_UNAUTHORIZED"],
		[403, { error: { code: "delegate_revoked" } }, "SEND_DELEGATE_REVOKED"],
		[403, { error: "wrong_role" }, "SEND_FORBIDDEN"],
	])("maps backend %i %j to %s", async (status, body, code) => {
		upstream.mockResolvedValueOnce(Response.json(body, { status }));
		const POST = await loadPost();
		const res = await POST(sendRequest());
		expect(res.status).toBe(status);
		expect(await errorCode(res)).toBe(code);
	});
});

describe("POST /api/transactions/send — feature flags", () => {
	it("is disabled by default", async () => {
		vi.stubEnv("MUX_SEND_FLOWS_ENABLED", "");
		const POST = await loadPost();
		const res = await POST(sendRequest());
		expect(res.status).toBe(403);
		expect(await errorCode(res)).toBe("SEND_DISABLED");
		expect(upstream).not.toHaveBeenCalled();
	});

	it("honours the kill switch over the enable flag", async () => {
		vi.stubEnv("MUX_SEND_KILL_SWITCH", "true");
		const POST = await loadPost();
		const res = await POST(sendRequest());
		expect(res.status).toBe(503);
		expect(await errorCode(res)).toBe("SEND_KILL_SWITCH_ENGAGED");
		expect(upstream).not.toHaveBeenCalled();
	});

	it("ignores NEXT_PUBLIC_* flags on the server", async () => {
		vi.stubEnv("MUX_SEND_FLOWS_ENABLED", "");
		vi.stubEnv("NEXT_PUBLIC_SEND_FLOWS_ENABLED", "true");
		const POST = await loadPost();
		expect((await POST(sendRequest())).status).toBe(403);
	});

	it("requires the mainnet opt-in", async () => {
		vi.stubEnv("MUX_STELLAR_NETWORK", "mainnet");
		const POST = await loadPost();
		const res = await POST(sendRequest({ ...VALID_BODY, network: "mainnet" }));
		expect(await errorCode(res)).toBe("SEND_MAINNET_NOT_ENABLED");
	});

	it("rejects a testnet request against a mainnet deploy and vice versa", async () => {
		vi.stubEnv("MUX_STELLAR_NETWORK", "mainnet");
		vi.stubEnv("MUX_SEND_MAINNET_ENABLED", "true");
		const POST = await loadPost();
		const res = await POST(sendRequest({ ...VALID_BODY, network: "testnet" }));
		expect(res.status).toBe(400);
		expect(await errorCode(res)).toBe("SEND_NETWORK_MISMATCH");
		expect(upstream).not.toHaveBeenCalled();
	});

	it("fails closed when the network is unset", async () => {
		vi.stubEnv("MUX_STELLAR_NETWORK", "");
		const POST = await loadPost();
		const res = await POST(sendRequest());
		expect(res.status).toBe(503);
		expect(await errorCode(res)).toBe("SEND_NETWORK_MISCONFIGURED");
	});
});

describe("POST /api/transactions/send — input validation", () => {
	it("requires a well-formed Idempotency-Key", async () => {
		const POST = await loadPost();
		for (const key of ["", "short", "has spaces in it!!!!"]) {
			const res = await POST(
				sendRequest(VALID_BODY, { "idempotency-key": key }),
			);
			expect(await errorCode(res)).toBe("SEND_IDEMPOTENCY_KEY_REQUIRED");
		}
		expect(upstream).not.toHaveBeenCalled();
	});

	it.each([
		["unknown key", { ...VALID_BODY, admin: true }],
		["zero amount", { ...VALID_BODY, amount: "0" }],
		["negative amount", { ...VALID_BODY, amount: "-1" }],
		["too many decimals", { ...VALID_BODY, amount: "1.12345678" }],
		["numeric amount", { ...VALID_BODY, amount: 1 }],
		["bad destination", { ...VALID_BODY, destination: "not-an-address" }],
		["bad asset", { ...VALID_BODY, asset: "USDC" }],
		["long memo", { ...VALID_BODY, memo: "m".repeat(29) }],
		["array", [VALID_BODY]],
	])("rejects %s", async (_label, body) => {
		const POST = await loadPost();
		const res = await POST(sendRequest(body));
		expect(res.status).toBe(400);
		expect(await errorCode(res)).toBe("SEND_INVALID_INPUT");
		expect(upstream).not.toHaveBeenCalled();
	});

	it("rejects oversized bodies", async () => {
		const POST = await loadPost();
		const res = await POST(sendRequest("x".repeat(5_000)));
		expect(res.status).toBe(413);
	});
});

describe("POST /api/transactions/send — fail closed", () => {
	it("never mocks a send when no backend is configured", async () => {
		vi.stubEnv("MUX_BACKEND_URL", "");
		vi.stubEnv("NEXT_PUBLIC_API_URL", "");
		vi.stubEnv("NEXT_PUBLIC_MUX_API_URL", "");
		vi.stubEnv("NEXT_PUBLIC_API_BASE", "");
		const POST = await loadPost();
		const res = await POST(sendRequest());
		expect(res.status).toBe(503);
		expect(await errorCode(res)).toBe("SEND_BACKEND_UNAVAILABLE");
	});

	it("returns 503 on network failure", async () => {
		upstream.mockRejectedValueOnce(new TypeError("fetch failed"));
		const POST = await loadPost();
		expect(await errorCode(await POST(sendRequest()))).toBe(
			"SEND_BACKEND_UNAVAILABLE",
		);
	});

	it("surfaces backend maintenance with a clamped Retry-After", async () => {
		upstream.mockResolvedValueOnce(
			new Response(null, {
				status: 503,
				headers: { "x-mux-maintenance": "true", "retry-after": "99999" },
			}),
		);
		const POST = await loadPost();
		const res = await POST(sendRequest());
		expect(res.status).toBe(503);
		expect(await errorCode(res)).toBe("SEND_MAINTENANCE");
		expect(res.headers.get("x-mux-maintenance")).toBe("true");
		expect(res.headers.get("retry-after")).toBe("300");
	});

	it("passes backend 429 through with Retry-After", async () => {
		upstream.mockResolvedValueOnce(
			new Response(null, { status: 429, headers: { "retry-after": "7" } }),
		);
		const POST = await loadPost();
		const res = await POST(sendRequest());
		expect(res.status).toBe(429);
		expect(res.headers.get("retry-after")).toBe("7");
	});

	it("does not report success for a non-JSON 2xx", async () => {
		upstream.mockResolvedValueOnce(new Response("ok", { status: 200 }));
		const POST = await loadPost();
		const res = await POST(sendRequest());
		expect(res.status).toBe(502);
		expect(await errorCode(res)).toBe("SEND_UPSTREAM_ERROR");
	});

	it("never echoes upstream error text", async () => {
		upstream.mockResolvedValueOnce(
			Response.json(
				{ error: { code: "boom", message: "internal secret sk_live_123" } },
				{ status: 500 },
			),
		);
		const POST = await loadPost();
		const text = await (await POST(sendRequest())).text();
		expect(text).not.toContain("sk_live_123");
	});
});

describe("POST /api/transactions/send — idempotency, rate limits, logging", () => {
	it("forwards the Idempotency-Key and correlation id to the backend", async () => {
		const POST = await loadPost();
		const res = await POST(
			sendRequest(VALID_BODY, { "x-correlation-id": "corr-1" }),
		);
		expect(res.status).toBe(201);
		expect(res.headers.get("x-correlation-id")).toBe("corr-1");
		const [url, init] = upstream.mock.calls[0];
		expect(url).toBe("https://backend.test/transactions");
		const headers = init?.headers as Record<string, string>;
		expect(headers["idempotency-key"]).toBe(IDEMPOTENCY_KEY);
		expect(headers["x-correlation-id"]).toBe("corr-1");
	});

	it("rejects a concurrent duplicate while the first is in flight", async () => {
		let release: (value: Response) => void = () => undefined;
		upstream.mockImplementationOnce(
			() =>
				new Promise<Response>((resolve) => {
					release = resolve;
				}),
		);
		const POST = await loadPost();
		const first = POST(sendRequest());
		await vi.waitFor(() => expect(upstream).toHaveBeenCalledTimes(1));
		const second = await POST(sendRequest());
		expect(second.status).toBe(409);
		expect(await errorCode(second)).toBe("SEND_REQUEST_IN_PROGRESS");
		release(Response.json({ id: "tx_1" }, { status: 201 }));
		expect((await first).status).toBe(201);
		// Sequential replay is forwarded so the backend returns the original outcome.
		expect((await POST(sendRequest())).status).toBe(201);
		expect(upstream).toHaveBeenCalledTimes(2);
	});

	it("rate-limits per caller", async () => {
		const POST = await loadPost();
		const statuses: number[] = [];
		for (let i = 0; i < 11; i += 1) {
			statuses.push((await POST(sendRequest())).status);
		}
		expect(statuses.slice(0, 10).every((s) => s === 201)).toBe(true);
		expect(statuses[10]).toBe(429);
	});

	it("logs no credentials, addresses, or amounts", async () => {
		const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
		const POST = await loadPost();
		await POST(sendRequest());
		const logged = info.mock.calls.map((call) => String(call[0])).join("\n");
		expect(logged).toContain('"event":"send.request"');
		expect(logged).not.toContain("test-token");
		expect(logged).not.toContain(DESTINATION);
		expect(logged).not.toContain(IDEMPOTENCY_KEY);
		expect(logged).not.toContain("1.5");
	});
});
