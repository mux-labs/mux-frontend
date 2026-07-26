import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NetworkMismatchBanner } from "../NetworkMismatchBanner";

describe("NetworkMismatchBanner", () => {
	it("renders nothing when networks match", () => {
		render(
			<NetworkMismatchBanner uiNetwork="testnet" backendNetwork="testnet" />,
		);
		expect(screen.queryByTestId("network-mismatch-banner")).toBeNull();
	});

	it("renders an alert when networks mismatch", () => {
		render(
			<NetworkMismatchBanner uiNetwork="mainnet" backendNetwork="testnet" />,
		);
		const banner = screen.getByTestId("network-mismatch-banner");
		expect(banner).toBeInTheDocument();
		expect(banner).toHaveAttribute("role", "alert");
		expect(banner.textContent).toContain("mainnet");
		expect(banner.textContent).toContain("testnet");
	});
});
