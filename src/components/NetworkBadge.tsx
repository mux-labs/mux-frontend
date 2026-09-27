/**
 * Network badge with WCAG 2.1 AA contrast (#826).
 *
 * Colors are fixed pairs with >= 4.5:1 text contrast. Network is conveyed by
 * text (never color alone), and unknown networks fail closed to a warning style.
 */

export type BadgeNetwork = "mainnet" | "testnet" | "futurenet";

export const NETWORK_BADGE_STYLES: Record<
	BadgeNetwork | "unknown",
	{ label: string; bg: string; fg: string }
> = {
	mainnet: { label: "Mainnet", bg: "#065F46", fg: "#FFFFFF" },
	testnet: { label: "Testnet", bg: "#FEF3C7", fg: "#78350F" },
	futurenet: { label: "Futurenet", bg: "#EDE9FE", fg: "#4C1D95" },
	unknown: { label: "Unknown network", bg: "#FEE2E2", fg: "#7F1D1D" },
};

function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

export function NetworkBadge({ network }: { network: string }) {
	const style =
		NETWORK_BADGE_STYLES[network as BadgeNetwork] ??
		NETWORK_BADGE_STYLES.unknown;
	return (
		<span
			role="status"
			aria-label={`Network: ${style.label}`}
			className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold"
			style={{ backgroundColor: style.bg, color: style.fg }}
		>
			{style.label}
		</span>
	);
}
