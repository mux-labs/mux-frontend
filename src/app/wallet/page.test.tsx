import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Wallet } from "@/types/wallet";

const replaceMock = vi.fn();
let searchParamsValue = new URLSearchParams("");

vi.mock("next/navigation", () => ({
	usePathname: () => "/wallet",
	useRouter: () => ({
		replace: (href: string) => {
			replaceMock(href);
			const query = href.includes("?") ? href.split("?")[1] : "";
			searchParamsValue = new URLSearchParams(query);
		},
	}),
	useSearchParams: () => searchParamsValue,
}));

import WalletPage from "./page";

const mockFundedWallet: Wallet = {
	id: "w-1",
	address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
	network: "mainnet",
	status: "active",
	createdAt: new Date("2024-01-15T10:30:00Z"),
	balance: "1,250.50 XLM",
};

const mockUnfundedWallet: Wallet = {
	id: "w-2",
	address: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOBER7KKQOAVSMIA",
	network: "mainnet",
	status: "active",
	createdAt: new Date("2024-03-10T16:45:00Z"),
	balance: "0.00 XLM",
};

beforeEach(() => {
	vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
	replaceMock.mockReset();
	searchParamsValue = new URLSearchParams("");
});

describe("WalletPage", () => {
	it("renders wallet details when wallets exist", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([mockFundedWallet]),
			}),
		);

		render(<WalletPage />);

		await waitFor(() =>
			expect(screen.getByText(/Wallet Details/i)).toBeInTheDocument(),
		);

		// Address should be displayed (appears in both header and code block)
		const addressElements = screen.getAllByText(mockFundedWallet.address);
		expect(addressElements.length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("1,250.50 XLM")).toBeInTheDocument();
	});

	it("shows empty state when no wallets are returned", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) }),
		);

		render(<WalletPage />);

		await waitFor(() =>
			expect(screen.getByText(/No wallets found/i)).toBeInTheDocument(),
		);
	});

	it("renders a Send button that is enabled when the wallet is funded", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([mockFundedWallet]),
			}),
		);

		render(<WalletPage />);

		await waitFor(() => {
			const sendButton = screen.getByRole("button", { name: /send funds/i });
			expect(sendButton).toBeInTheDocument();
			expect(sendButton).not.toBeDisabled();
		});
	});

	it("renders a Send button that is disabled when the wallet is not funded", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([mockUnfundedWallet]),
			}),
		);

		render(<WalletPage />);

		await waitFor(() => {
			const sendButton = screen.getByRole("button", { name: /cannot send/i });
			expect(sendButton).toBeInTheDocument();
			expect(sendButton).toBeDisabled();
		});
	});

	it("opens the receive modal from the wallet details page", async () => {
		const user = userEvent.setup();
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([mockFundedWallet]),
			}),
		);

		render(<WalletPage />);

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /receive funds/i }),
			).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: /receive funds/i }));

		const dialog = screen.getByRole("dialog");
		expect(dialog).toBeInTheDocument();
		expect(
			await within(dialog).findByRole("img", {
				name: `QR code for wallet address ${mockFundedWallet.address}`,
			}),
		).toBeInTheDocument();
		expect(
			within(dialog).getByText(mockFundedWallet.address),
		).toBeInTheDocument();
		expect(replaceMock).toHaveBeenCalledWith("/wallet?receive=1", {
			scroll: false,
		});
	});

	it("opens the receive modal from a deep-linked receive query param", async () => {
		searchParamsValue = new URLSearchParams("receive=1");

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([mockFundedWallet]),
			}),
		);

		render(<WalletPage />);

		await waitFor(() => {
			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});
	});

	it("shows send and receive guidance for funded wallets", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([mockFundedWallet]),
			}),
		);

		render(<WalletPage />);

		await waitFor(() => {
			expect(screen.getByText(/send or receive funds/i)).toBeInTheDocument();
			expect(
				screen.getByText(
					/send tokens out or show the receive qr code for incoming transfers/i,
				),
			).toBeInTheDocument();
		});
	});

	it("shows receive guidance for unfunded wallets", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([mockUnfundedWallet]),
			}),
		);

		render(<WalletPage />);

		await waitFor(() => {
			expect(
				screen.getByText(
					/show the receive qr code or copy the address to accept incoming transfers/i,
				),
			).toBeInTheDocument();
		});
	});
});
