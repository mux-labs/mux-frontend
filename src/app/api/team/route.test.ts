import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/team", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/team", () => {
  beforeEach(() => {
    // Reset the in-memory mockTeam store between tests by replaying a fresh
    // module state is not possible here, so use unique emails per test.
  });

  it("returns 200 when the same email and role already exist (idempotent replay)", async () => {
    const email = `idempotent-${Date.now()}@example.com`;
    const role = "member";

    const first = await POST(makeRequest({ email, role }));
    expect(first.status).toBe(200);

    const second = await POST(makeRequest({ email, role }));
    expect(second.status).toBe(200);

    const body = await second.json();
    expect(body).toBeTruthy();
  });

  it("returns 409 MEMBER_EXISTS when the email exists with a different role", async () => {
    const email = `conflict-${Date.now()}@example.com`;

    const first = await POST(makeRequest({ email, role: "member" }));
    expect(first.status).toBe(200);

    const second = await POST(makeRequest({ email, role: "admin" }));
    expect(second.status).toBe(409);

    const body = await second.json();
    expect(body.code).toBe("MEMBER_EXISTS");
  });
});
