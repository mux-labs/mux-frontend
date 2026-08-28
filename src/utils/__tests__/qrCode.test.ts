import { describe, expect, it } from "vitest";
import { generateQrSvgDataUrl } from "@/utils/qrCode";

const ADDRESS = "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";

describe("generateQrSvgDataUrl", () => {
	it("returns a base64 SVG data URL", async () => {
		const dataUrl = await generateQrSvgDataUrl(ADDRESS);
		expect(dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);

		const base64 = dataUrl.replace("data:image/svg+xml;base64,", "");
		const svg = Buffer.from(base64, "base64").toString("utf-8");
		expect(svg).toContain("<svg");
		expect(svg).toContain("</svg>");
	});

	it("encodes the given size into the SVG dimensions", async () => {
		const dataUrl = await generateQrSvgDataUrl(ADDRESS, { size: 512 });
		const svg = Buffer.from(
			dataUrl.replace("data:image/svg+xml;base64,", ""),
			"base64",
		).toString("utf-8");
		expect(svg).toContain('width="512"');
		expect(svg).toContain('height="512"');
	});

	it("produces different output for different addresses", async () => {
		const a = await generateQrSvgDataUrl(ADDRESS);
		const b = await generateQrSvgDataUrl(
			"GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
		);
		expect(a).not.toBe(b);
	});
});
