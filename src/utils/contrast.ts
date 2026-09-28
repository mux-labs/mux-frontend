// WCAG 2.1 contrast helpers used to audit the dark-mode palette.

export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3;

// Dark-mode text/background pairs that must meet AA for normal text.
export const DARK_MODE_PAIRS: Array<{ name: string; fg: string; bg: string }> = [
	{ name: "body text", fg: "#f4f4f5", bg: "#09090b" },
	{ name: "muted text", fg: "#a1a1aa", bg: "#09090b" },
	{ name: "card text", fg: "#f4f4f5", bg: "#18181b" },
	{ name: "muted card text", fg: "#a1a1aa", bg: "#18181b" },
	{ name: "error text", fg: "#f87171", bg: "#09090b" },
	{ name: "link text", fg: "#60a5fa", bg: "#09090b" },
];

function channel(value: number): number {
	const c = value / 255;
	return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
	const match = /^#?([0-9a-f]{6})$/i.exec(hex);
	if (!match) throw new Error(`Invalid hex color: ${hex}`);
	const n = Number.parseInt(match[1], 16);
	return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(fg: string, bg: string): number {
	const a = relativeLuminance(fg);
	const b = relativeLuminance(bg);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function meetsAA(fg: string, bg: string, largeText = false): boolean {
	return contrastRatio(fg, bg) >= (largeText ? WCAG_AA_LARGE : WCAG_AA_NORMAL);
}
