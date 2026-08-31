/**
 * Friendbot utilities for Stellar testnet
 * Friendbot is a testnet faucet that funds new accounts with test XLM.
 *
 * Mainnet guard (#695): calling any funding helper with network="mainnet"
 * throws immediately. Friendbot is a testnet-only service; allowing it to
 * run against mainnet would silently no-op at best, or reveal an address to
 * a public faucet API at worst. The guard is explicit so the error surfaces
 * at the call-site rather than failing silently after a network round-trip.
 */

export const FRIENDBOT_URL = "https://friendbot.stellar.org/";
export const FRIENDBOT_DOCS_URL =
	"https://developers.stellar.org/docs/learn/fundamentals/testnet";

/**
 * Thrown whenever a Friendbot helper is called with network="mainnet".
 * Use a named class so callers can `catch (err) { if (err instanceof MainnetFriendbotError) … }`.
 */
export class MainnetFriendbotError extends Error {
	constructor() {
		super(
			"Friendbot is a testnet-only faucet and cannot be used on mainnet. " +
				"Switch to testnet before calling any Friendbot helper.",
		);
		this.name = "MainnetFriendbotError";
	}
}

/**
 * Generates a Friendbot funding URL for a given Stellar address.
 * @param address - The Stellar address to fund
 * @param network - The active network; throws {@link MainnetFriendbotError} on mainnet
 * @returns The Friendbot URL with the address parameter
 */
export function getFriendbotUrl(
	address: string,
	network?: "mainnet" | "testnet",
): string {
	if (network === "mainnet") {
		throw new MainnetFriendbotError();
	}

	if (!address || !address.trim()) {
		throw new Error("Address cannot be empty");
	}

	const url = new URL(FRIENDBOT_URL);
	url.searchParams.set("addr", address);
	return url.toString();
}

/**
 * Checks if an address is eligible for Friendbot funding.
 * Friendbot can only fund addresses on testnet.
 * @param network - The network (mainnet or testnet)
 * @returns true if the address can be funded by Friendbot
 */
export function isFriendbotEligible(network: "mainnet" | "testnet"): boolean {
	return network === "testnet";
}

/**
 * Asserts that the current network is testnet.
 * Throws {@link MainnetFriendbotError} when called with network="mainnet".
 * Call this at the top of any function that performs a Friendbot action so
 * the guard is explicit and cannot be bypassed.
 *
 * @example
 * ```ts
 * function fundAccount(address: string, network: "mainnet" | "testnet") {
 *   assertTestnetOnly(network);          // throws on mainnet
 *   return getFriendbotUrl(address);
 * }
 * ```
 */
export function assertTestnetOnly(network: "mainnet" | "testnet"): void {
	if (network === "mainnet") {
		throw new MainnetFriendbotError();
	}
}

/**
 * Validates if a Stellar address is valid for Friendbot.
 * Stellar addresses start with 'G' and are 56 characters long.
 */
export function isValidAddressForFriendbot(address: string): boolean {
	if (!address || typeof address !== "string") return false;
	return /^G[A-Z2-7]{55}$/.test(address);
}
