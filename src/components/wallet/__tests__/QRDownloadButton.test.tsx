import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QRDownloadButton } from "../QRDownloadButton";

describe("QRDownloadButton", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("renders an accessible download action", () => {
		render(<QRDownloadButton address="GADDRESS" />);
		expect(
			screen.getByRole("button", { name: "Download receive address QR code" }),
		).toBeInTheDocument();
	});

	it("disables the action when there is no address", () => {
		render(<QRDownloadButton address="" />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("invokes onDownload with the address once the QR export completes", async () => {
		const user = userEvent.setup();
		const onDownload = vi.fn();
		render(<QRDownloadButton address="GADDRESS" onDownload={onDownload} />);

		await user.click(screen.getByRole("button"));

		await waitFor(() => expect(onDownload).toHaveBeenCalledWith("GADDRESS"));
	});

	it("generates a real QR SVG file and downloads it via an anchor element", async () => {
		const user = userEvent.setup();
		const originalCreateElement = document.createElement.bind(document);
		let capturedLink: HTMLAnchorElement | null = null;

		vi.spyOn(document, "createElement").mockImplementation(
			(tagName: string) => {
				const el = originalCreateElement(tagName);
				if (tagName === "a") {
					capturedLink = el as HTMLAnchorElement;
					vi.spyOn(el, "click").mockImplementation(() => {});
				}
				return el;
			},
		);

		render(<QRDownloadButton address="GADDRESS" />);
		await user.click(screen.getByRole("button"));

		await waitFor(() => expect(capturedLink).not.toBeNull());
		expect(capturedLink?.download).toBe("GADDRESS-qr.svg");
		expect(capturedLink?.href).toMatch(/^data:image\/svg\+xml;base64,/);
		expect(capturedLink?.click).toHaveBeenCalled();
	});
});
