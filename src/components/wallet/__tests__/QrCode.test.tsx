import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QrCode } from "../QrCode";

const ADDRESS = "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";

describe("QrCode", () => {
	it("shows a loading placeholder before the QR code is ready", () => {
		render(<QrCode value={ADDRESS} />);
		expect(screen.getByLabelText(/generating qr code/i)).toBeInTheDocument();
	});

	it("renders a real QR image encoding the address", async () => {
		render(<QrCode value={ADDRESS} />);

		const img = await screen.findByRole("img", {
			name: `QR code for wallet address ${ADDRESS}`,
		});
		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute(
			"src",
			expect.stringMatching(/^data:image\/svg\+xml;base64,/),
		);
	});

	it("re-generates the QR code when the value changes", async () => {
		const { rerender } = render(<QrCode value={ADDRESS} />);
		const firstImg = await screen.findByRole("img");
		const firstSrc = firstImg.getAttribute("src");

		const otherAddress =
			"GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE";
		rerender(<QrCode value={otherAddress} />);

		await waitFor(async () => {
			const img = await screen.findByRole("img", {
				name: `QR code for wallet address ${otherAddress}`,
			});
			expect(img.getAttribute("src")).not.toBe(firstSrc);
		});
	});
});
