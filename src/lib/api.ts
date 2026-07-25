import type { Wallet } from "@/types/wallet";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
		this.name = "ApiError";
	}
}

function reviveWallet(w: Wallet): Wallet {
	return {
		...w,
		createdAt: new Date(w.createdAt),
		lastActivity: w.lastActivity ? new Date(w.lastActivity) : undefined,
	};
}

export async function fetchWallets(): Promise<Wallet[]> {
	const res = await fetch(`${API_BASE_URL}/api/wallets`);
	if (!res.ok) {
		throw new ApiError(
			res.status,
			`Failed to fetch wallets: ${res.statusText}`,
		);
	}
	const data = (await res.json()) as Wallet[];
	return data.map(reviveWallet);
}

export async function fetchWalletById(id: string): Promise<Wallet> {
	const res = await fetch(`${API_BASE_URL}/api/wallets/${id}`);
	if (!res.ok) {
		throw new ApiError(
			res.status,
			`Failed to fetch wallet ${id}: ${res.statusText}`,
		);
	}
	const data = (await res.json()) as Wallet;
	return reviveWallet(data);
}
