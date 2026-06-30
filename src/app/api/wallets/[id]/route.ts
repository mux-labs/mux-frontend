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
