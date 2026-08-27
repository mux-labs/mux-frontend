import QRCode from "qrcode";

export interface QrCodeOptions {
	/** Pixel width/height of the rendered QR code. */
	size?: number;
	/** Quiet-zone width in modules. */
	margin?: number;
}

function toBase64(input: string): string {
	if (typeof btoa === "function") return btoa(input);
	return Buffer.from(input, "utf-8").toString("base64");
}

/**
 * Encodes `value` as a QR code and returns it as a base64
 * `data:image/svg+xml` URL — usable directly as an `<img src>` or as a
 * downloadable file href. SVG rendering needs no canvas/DOM APIs, so it
 * behaves the same in the browser, on the server, and under jsdom tests.
 */
export async function generateQrSvgDataUrl(
	value: string,
	{ size = 256, margin = 1 }: QrCodeOptions = {},
): Promise<string> {
	const svg = await QRCode.toString(value, {
		type: "svg",
		margin,
		width: size,
	});
	return `data:image/svg+xml;base64,${toBase64(svg)}`;
}
