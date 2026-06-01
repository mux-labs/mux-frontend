import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NetworkBadge } from "@/components/wallet/NetworkBadge";

describe("NetworkBadge", () => {
	it('renders "Mainnet" for mainnet', () => {
		render(<NetworkBadge network="mainnet" />);
		expect(screen.getByText("Mainnet")).toBeInTheDocument();
	});

	it('renders "Testnet" for testnet', () => {
		render(<NetworkBadge network="testnet" />);
		expect(screen.getByText("Testnet")).toBeInTheDocument();
	});

	it('renders "Unknown" for an unrecognized network string', () => {
		render(<NetworkBadge network="devnet" />);
		expect(screen.getByText("Unknown")).toBeInTheDocument();
	});

	it('renders "Unknown" for null', () => {
		render(<NetworkBadge network={null} />);
		expect(screen.getByText("Unknown")).toBeInTheDocument();
	});

	it('renders "Unknown" for undefined', () => {
		render(<NetworkBadge network={undefined} />);
		expect(screen.getByText("Unknown")).toBeInTheDocument();
	});

	it('renders "Unknown" for empty string', () => {
		render(<NetworkBadge network="" />);
		expect(screen.getByText("Unknown")).toBeInTheDocument();
	});

	it("is case-insensitive for known networks", () => {
		render(<NetworkBadge network="MAINNET" />);
		expect(screen.getByText("Mainnet")).toBeInTheDocument();
	});
});
