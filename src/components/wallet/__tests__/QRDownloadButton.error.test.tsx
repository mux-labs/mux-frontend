import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/utils/qrCode", () => ({
	generateQrSvgDataUrl: vi.fn().mockRejectedValue(new Error("boom")),
}));

const { QRDownloadButton } = await import("../QRDownloadButton");

describe("QRDownloadButton (QR generation failure)", () => {
	it("shows an error message instead of throwing when QR generation fails", async () => {
		const user = userEvent.setup();
		const onDownload = vi.fn();

		render(<QRDownloadButton address="GADDRESS" onDownload={onDownload} />);
		await user.click(screen.getByRole("button"));

		await waitFor(() => {
			expect(
				screen.getByText(/unable to generate the qr code/i),
			).toBeInTheDocument();
		});
		expect(onDownload).not.toHaveBeenCalled();
	});
});
