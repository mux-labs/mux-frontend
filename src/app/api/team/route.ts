import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Builds a correlation id for team route responses.
 *
 * Uses `crypto.randomUUID` when the runtime provides it. Otherwise it falls
 * back to `Date.now` plus `Math.random`, which is only intended for runtimes
 * without `crypto.randomUUID`.
 */
function newCorrelationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const correlationId = newCorrelationId();
  const limited = await rateLimit(`team:${session.user.id}`);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests", correlationId },
      { status: 429, headers: { "x-correlation-id": correlationId } },
    );
  }

  return NextResponse.json(
    { correlationId },
    { headers: { "x-correlation-id": correlationId } },
  );
}
