import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Wallet } from "@/types/wallet";
import ReceiveWalletModal from "./ReceiveWalletModal";

const VALID_ADDRESS =
	"GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";

const ACTIVE_WALLET: Wallet = {
	id: "wallet-1",
	address: VALID_ADDRESS,
	network: "mainnet",
	status: "active",
	createdAt: new Date("2024-01-15T10:30:00Z"),
	balance: "1250.50 XLM",
};

const INACTIVE_WALLET: Wallet = {
	...ACTIVE_WALLET,
	id: "wallet-2",
	status: "inactive",
};

const INVALID_WALLET: Wallet = {
	...ACTIVE_WALLET,
	id: "wallet-3",
	address: "invalid-address",
} as Wallet;

beforeEach(() => {
	Object.defineProperty(navigator, "clipboard", {
		value: {
			writeText: vi.fn().mockResolvedValue(undefined),
		},
		configurable: true,
	});
});

describe("ReceiveWalletModal", () => {
	it("does not render when closed", () => {
		const { container } = render(
			<ReceiveWalletModal
				isOpen={false}
				wallet={ACTIVE_WALLET}
				onClose={vi.fn()}
			/>,
		);

		expect(container.firstChild).toBeNull();
	});

	it("renders a real QR code and wallet address for a valid wallet", async () => {
		render(
			<ReceiveWalletModal
				isOpen={true}
				wallet={ACTIVE_WALLET}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText(/receive funds/i)).toBeInTheDocument();
		expect(screen.getByText(VALID_ADDRESS)).toBeInTheDocument();

		const qrImage = await screen.findByRole("img", {
			name: `QR code for wallet address ${VALID_ADDRESS}`,
		});
		expect(qrImage).toHaveAttribute(
			"src",
			expect.stringMatching(/^data:image\/svg\+xml;base64,/),
		);
	});

	it("offers a QR download action for a valid wallet", () => {
		render(
			<ReceiveWalletModal
				isOpen={true}
				wallet={ACTIVE_WALLET}
				onClose={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("button", { name: /download receive address qr code/i }),
		).toBeInTheDocument();
	});

	it("copies the wallet address to the clipboard", async () => {
		const user = userEvent.setup();
		render(
			<ReceiveWalletModal
				isOpen={true}
				wallet={ACTIVE_WALLET}
				onClose={vi.fn()}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: /copy wallet address/i }),
		);

		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(VALID_ADDRESS);
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /address copied/i }),
			).toBeInTheDocument();
		});
	});

	it("shows a stale wallet warning when the wallet is inactive", () => {
		render(
			<ReceiveWalletModal
				isOpen={true}
				wallet={INACTIVE_WALLET}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByRole("status")).toHaveTextContent(/inactive/i);
	});

	it("shows an invalid wallet state instead of a QR code", () => {
		render(
			<ReceiveWalletModal
				isOpen={true}
				wallet={INVALID_WALLET}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByRole("alert")).toHaveTextContent(/not valid yet/i);
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});
});
