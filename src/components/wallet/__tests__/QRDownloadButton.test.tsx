import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QRDownloadButton } from "../QRDownloadButton";

describe("QRDownloadButton", () => {
	it("renders an accessible download action", () => {
		render(<QRDownloadButton address="GADDRESS" />);
		expect(
			screen.getByRole("button", { name: "Download receive address QR code" }),
		).toBeInTheDocument();
	});

	it("invokes onDownload with the address when clicked", () => {
		const onDownload = vi.fn();
		render(<QRDownloadButton address="GADDRESS" onDownload={onDownload} />);
		fireEvent.click(screen.getByRole("button"));
		expect(onDownload).toHaveBeenCalledWith("GADDRESS");
	});

	it("disables the action when there is no address", () => {
		render(<QRDownloadButton address="" />);
		expect(screen.getByRole("button")).toBeDisabled();
	});
});
