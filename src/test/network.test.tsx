import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WalletTable } from "@/components/wallet/WalletTable";
import { NetworkProvider, useNetwork } from "@/context/NetworkContext";
import type { Wallet } from "@/types/wallet";

// --- NetworkContext tests ---

function NetworkDisplay() {
	const { network, setNetwork } = useNetwork();
	return (
		<div>
			<span data-testid="network">{network}</span>
			<button onClick={() => setNetwork("testnet")}>Switch Testnet</button>
			<button onClick={() => setNetwork("mainnet")}>Switch Mainnet</button>
		</div>
	);
}

describe("NetworkContext", () => {
	it("defaults to mainnet", () => {
		render(
			<NetworkProvider>
				<NetworkDisplay />
			</NetworkProvider>,
		);
		expect(screen.getByTestId("network")).toHaveTextContent("mainnet");
	});

	it("switches to testnet", () => {
		render(
			<NetworkProvider>
				<NetworkDisplay />
			</NetworkProvider>,
		);
		fireEvent.click(screen.getByText("Switch Testnet"));
		expect(screen.getByTestId("network")).toHaveTextContent("testnet");
	});

	it("switches back to mainnet", () => {
		render(
			<NetworkProvider>
				<NetworkDisplay />
			</NetworkProvider>,
		);
		fireEvent.click(screen.getByText("Switch Testnet"));
		fireEvent.click(screen.getByText("Switch Mainnet"));
		expect(screen.getByTestId("network")).toHaveTextContent("mainnet");
	});

	it("throws when used outside provider", () => {
		const original = console.error;
		console.error = () => {};
		expect(() => render(<NetworkDisplay />)).toThrow(
			"useNetwork must be used within NetworkProvider",
		);
		console.error = original;
	});
});

describe("NetworkContext — localStorage persistence", () => {
	beforeEach(() => {
		localStorage.removeItem("mux_network");
	});

	afterEach(() => {
		localStorage.removeItem("mux_network");
	});

	it("persists the selected network to localStorage", () => {
		render(
			<NetworkProvider>
				<NetworkDisplay />
			</NetworkProvider>,
		);
		fireEvent.click(screen.getByText("Switch Testnet"));
		expect(localStorage.getItem("mux_network")).toBe("testnet");
	});

	it("restores the persisted network after a remount (e.g. page reload)", () => {
		const { unmount } = render(
			<NetworkProvider>
				<NetworkDisplay />
			</NetworkProvider>,
		);
		fireEvent.click(screen.getByText("Switch Testnet"));
		expect(screen.getByTestId("network")).toHaveTextContent("testnet");
		unmount();

		render(
			<NetworkProvider>
				<NetworkDisplay />
			</NetworkProvider>,
		);
		expect(screen.getByTestId("network")).toHaveTextContent("testnet");
	});

	it("falls back to the default network when localStorage holds an invalid value", () => {
		localStorage.setItem("mux_network", "not-a-real-network");
		render(
			<NetworkProvider>
				<NetworkDisplay />
			</NetworkProvider>,
		);
		expect(screen.getByTestId("network")).toHaveTextContent("mainnet");
	});
});

// --- WalletTable filtering tests ---

const mainnetWallet: Wallet = {
	id: "w1",
	address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
	network: "mainnet",
	status: "active",
	createdAt: new Date("2024-01-01"),
	balance: "100 XLM",
};

const testnetWallet: Wallet = {
	id: "w2",
	address: "GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
	network: "testnet",
	status: "active",
	createdAt: new Date("2024-01-02"),
	balance: "200 XLM",
};

describe("WalletTable", () => {
	it("renders wallets passed to it", () => {
		render(<WalletTable wallets={[mainnetWallet, testnetWallet]} />);
		expect(screen.getByText("100 XLM")).toBeInTheDocument();
		expect(screen.getByText("200 XLM")).toBeInTheDocument();
	});

	it("shows empty state when wallets array is empty", () => {
		render(<WalletTable wallets={[]} />);
		expect(
			screen.getByText("No wallets found for this network."),
		).toBeInTheDocument();
	});

	it("renders only mainnet wallets when filtered at page level", () => {
		const filtered = [mainnetWallet, testnetWallet].filter(
			(w) => w.network === "mainnet",
		);
		render(<WalletTable wallets={filtered} />);
		expect(screen.getByText("100 XLM")).toBeInTheDocument();
		expect(screen.queryByText("200 XLM")).not.toBeInTheDocument();
	});

	it("renders only testnet wallets when filtered at page level", () => {
		const filtered = [mainnetWallet, testnetWallet].filter(
			(w) => w.network === "testnet",
		);
		render(<WalletTable wallets={filtered} />);
		expect(screen.getByText("200 XLM")).toBeInTheDocument();
		expect(screen.queryByText("100 XLM")).not.toBeInTheDocument();
	});
});
