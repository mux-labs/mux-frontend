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

function normalizeWallet(wallet: Wallet): Wallet {
	return {
		...wallet,
		createdAt: new Date(wallet.createdAt),
		lastActivity: wallet.lastActivity ? new Date(wallet.lastActivity) : undefined,
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
	return data.map(normalizeWallet);
}

export async function fetchWalletById(walletId: string): Promise<Wallet> {
	const res = await fetch(`${API_BASE_URL}/api/wallets/${walletId}`);
	if (res.ok) {
		const wallet = (await res.json()) as Wallet;
		return normalizeWallet(wallet);
	}

	if (res.status === 404) {
		const wallets = await fetchWallets();
		const wallet = wallets.find((item) => item.id === walletId);
		if (wallet) {
			return wallet;
		}
		throw new ApiError(404, `Wallet ${walletId} not found`);
	}

	throw new ApiError(
		res.status,
		`Failed to fetch wallet: ${res.statusText}`,
	);
}
