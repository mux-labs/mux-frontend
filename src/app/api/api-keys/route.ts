import { NextResponse } from "next/server";
import { createApiKey, getApiKeys, revokeApiKey } from "@/mock-data/api-keys";

export async function GET() {
	// In real integration, replace with DB or upstream service call.
	return NextResponse.json({ data: getApiKeys() });
}

export async function POST(request: Request) {
	const body = (await request.json().catch(() => null)) as {
		name?: string;
	} | null;
	const name = body?.name?.trim();

	if (!name) {
		return NextResponse.json(
			{ error: "API key name is required" },
			{ status: 400 },
		);
	}

	return NextResponse.json({ data: createApiKey(name) }, { status: 201 });
}

export async function PATCH(request: Request) {
	const body = (await request.json().catch(() => null)) as {
		id?: string;
		action?: string;
	} | null;

	if (!body?.id || body.action !== "revoke") {
		return NextResponse.json(
			{ error: "API key id and revoke action are required" },
			{ status: 400 },
		);
	}

	const revoked = revokeApiKey(body.id);
	if (!revoked) {
		return NextResponse.json({ error: "API key not found" }, { status: 404 });
	}

	return NextResponse.json({ data: revoked });
}
