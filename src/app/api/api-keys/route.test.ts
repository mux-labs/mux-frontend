import { describe, expect, it } from "vitest";
import { POST } from "./route";

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/api-keys", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function errorCode(response: Response): Promise<string | undefined> {
  const json = (await response.json()) as {
    error?: { code?: string };
  };
  return json.error?.code;
}

describe("POST /api/api-keys confirmation guard", () => {
  it("rejects rotate without confirm:true with 400 API_KEY_CONFIRMATION_REQUIRED", async () => {
    const response = await POST(postRequest({ action: "rotate", id: "key_1" }));
    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe("API_KEY_CONFIRMATION_REQUIRED");
  });

  it("rejects revoke without confirm:true with 400 API_KEY_CONFIRMATION_REQUIRED", async () => {
    const response = await POST(postRequest({ action: "revoke", id: "key_1" }));
    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe("API_KEY_CONFIRMATION_REQUIRED");
  });

  it("does not require confirm for create", async () => {
    const response = await POST(postRequest({ action: "create", name: "ci" }));
    expect(await errorCode(response)).not.toBe("API_KEY_CONFIRMATION_REQUIRED");
  });
});
