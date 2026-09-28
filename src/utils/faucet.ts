import { getNetworkConfig } from "./network-resolver";

// The faucet CTA is only ever shown on known test networks. Mainnet, unknown
// networks, and a missing network all hide it (fail closed). Setting
// NEXT_PUBLIC_FAUCET_ENABLED=false acts as a kill switch on every network.
export function shouldShowFaucet(
	network: string | null | undefined,
	flag: string | undefined = process.env.NEXT_PUBLIC_FAUCET_ENABLED,
): boolean {
	if (flag === "false") return false;
	if (!network) return false;
	return getNetworkConfig(network)?.isTestnet === true;
}
