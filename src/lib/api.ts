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

function normalizeWalletsPayload(payload: unknown): Wallet[] {
	if (Array.isArray(payload)) {
		return payload as Wallet[];
	}

	if (payload && typeof payload === "object") {
		const record = payload as Record<string, unknown>;
		if (Array.isArray(record.wallets)) {
			return record.wallets as Wallet[];
		}

		if (record.data && typeof record.data === "object") {
			const data = record.data as Record<string, unknown>;
			if (Array.isArray(data.wallets)) {
				return data.wallets as Wallet[];
			}
		}
	}

	return [];
}

export async function fetchWallets(): Promise<Wallet[]> {
	const res = await fetch(`${API_BASE_URL}/api/wallets`);
	if (!res.ok) {
		throw new ApiError(
			res.status,
			`Failed to fetch wallets: ${res.statusText}`,
		);
	}

	const data = await res.json();
	return normalizeWalletsPayload(data).map((w) => ({
		...w,
		createdAt: new Date(w.createdAt),
		lastActivity: w.lastActivity ? new Date(w.lastActivity) : undefined,
	}));
}
