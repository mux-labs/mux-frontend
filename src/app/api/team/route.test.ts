import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const rateLimitMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (...args: unknown[]) => rateLimitMock(...args),
}));

import { GET } from "./route";

describe("GET /api/team", () => {
  beforeEach(() => {
    authMock.mockReset();
    rateLimitMock.mockReset();
  });

  it("returns 401 for Basic authorization", async () => {
    authMock.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/team", {
      headers: { authorization: "Basic x" },
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(rateLimitMock).not.toHaveBeenCalled();
  });
});
