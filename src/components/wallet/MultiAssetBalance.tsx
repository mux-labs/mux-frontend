"use client";

import { formatXLM } from "@/utils/xlmFormat";

export interface AssetBalance {
	/** Asset code, e.g. "XLM", "USDC". Native XLM uses "XLM". */
	code: string;
	/** Issuer account id, omitted for native XLM. */
	issuer?: string;
	balance: string;
}

interface MultiAssetBalanceProps {
	assets: AssetBalance[];
	className?: string;
}

/**
 * Displays a wallet's balances across multiple Stellar assets on the
 * account detail view. Native XLM is formatted with consistent precision;
 * other assets show the raw balance alongside their asset code.
 */
export function MultiAssetBalance({ assets, className }: MultiAssetBalanceProps) {
	if (assets.length === 0) {
		return <p className={className}>No asset balances found.</p>;
	}

	return (
		<ul className={className} aria-label="Asset balances">
			{assets.map((asset) => (
				<li key={`${asset.code}-${asset.issuer ?? "native"}`}>
					<span>{asset.code}</span>{" "}
					<span>
						{asset.code === "XLM"
							? formatXLM(asset.balance)
							: `${asset.balance} ${asset.code}`}
					</span>
				</li>
			))}
		</ul>
	);
}
