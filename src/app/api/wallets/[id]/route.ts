import { NextResponse } from "next/server";
import { dummyWallets } from "@/mock-data/wallets";

type RouteContext = {
	params:
		| {
				id: string;
		  }
		| Promise<{
				id: string;
		  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
	const { id } = await params;
	const walletId = id.trim();
	const wallet = dummyWallets.find((candidate) => candidate.id === walletId);

	if (!wallet) {
		return NextResponse.json({ error: "not_found" }, { status: 404 });
	}

	return NextResponse.json(wallet);
}

export async function PATCH(request: Request, { params }: RouteContext) {
	const { id } = await params;
	const wallet = dummyWallets.find((candidate) => candidate.id === id.trim());
	if (!wallet) {
		return NextResponse.json({ error: "not_found" }, { status: 404 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "invalid_json" }, { status: 400 });
	}

	const label =
		typeof body === "object" && body !== null && "label" in body
			? (body as { label: unknown }).label
			: undefined;
	if (typeof label !== "string") {
		return NextResponse.json({ error: "label_required" }, { status: 400 });
	}

	const normalized = label.trim();
	if (normalized.length > 30 || /[<>"'&]/.test(normalized)) {
		return NextResponse.json({ error: "invalid_label" }, { status: 422 });
	}

	wallet.label = normalized || undefined;
	return NextResponse.json(wallet);
}
