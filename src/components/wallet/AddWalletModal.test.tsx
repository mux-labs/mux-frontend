import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddWalletModal } from "./AddWalletModal";

const VALID_ADDRESS =
	"GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";

const ANOTHER_VALID_ADDRESS =
	"GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE";

function renderModal(
	props?: Partial<React.ComponentProps<typeof AddWalletModal>>,
) {
	const onClose = vi.fn();
	const onAdd = vi.fn();
	render(
		<AddWalletModal isOpen={true} onClose={onClose} onAdd={onAdd} {...props} />,
	);
	return { onClose, onAdd };
}

// ─── Visibility ───────────────────────────────────────────────────────────────

describe("AddWalletModal visibility", () => {
	it("renders when isOpen is true", () => {
		renderModal();
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText("Add Wallet")).toBeInTheDocument();
	});

	it("does not render when isOpen is false", () => {
		render(<AddWalletModal isOpen={false} onClose={vi.fn()} onAdd={vi.fn()} />);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});
});

// ─── Form fields ──────────────────────────────────────────────────────────────

describe("AddWalletModal form", () => {
	it("renders address input, network select, and label input", () => {
		renderModal();
		expect(screen.getByLabelText(/stellar address/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/network/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/label/i)).toBeInTheDocument();
	});

	it("defaults network to mainnet", () => {
		renderModal();
		const select = screen.getByLabelText(/network/i) as HTMLSelectElement;
		expect(select.value).toBe("mainnet");
	});

	it("allows switching network to testnet", async () => {
		const user = userEvent.setup();
		renderModal();
		const select = screen.getByLabelText(/network/i);
		await user.selectOptions(select, "testnet");
		expect((select as HTMLSelectElement).value).toBe("testnet");
	});

	it("label field is marked as optional", () => {
		renderModal();
		expect(screen.getByText(/optional/i)).toBeInTheDocument();
	});
});

// ─── Address validation ───────────────────────────────────────────────────────

describe("AddWalletModal address validation", () => {
	it("shows an error when submitting an empty address", async () => {
		const user = userEvent.setup();
		renderModal();
		await user.click(screen.getByRole("button", { name: /add wallet/i }));
		expect(await screen.findByRole("alert")).toBeInTheDocument();
		expect(screen.getByRole("alert")).toHaveTextContent(/required/i);
	});

	it("shows an error for an address that doesn't start with G", async () => {
		const user = userEvent.setup();
		renderModal();
		await user.type(
			screen.getByLabelText(/stellar address/i),
			"XBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
		);
		await user.click(screen.getByRole("button", { name: /add wallet/i }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			/start with 'G'/i,
		);
	});

	it("shows an error for an address that is too short", async () => {
		const user = userEvent.setup();
		renderModal();
		await user.type(screen.getByLabelText(/stellar address/i), "GABC");
		await user.click(screen.getByRole("button", { name: /add wallet/i }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			/56 characters/i,
		);
	});

	it("shows an error on blur for an invalid address", async () => {
		const user = userEvent.setup();
		renderModal();
		await user.type(screen.getByLabelText(/stellar address/i), "GABC");
		await user.tab();
		expect(await screen.findByRole("alert")).toHaveTextContent(
			/56 characters/i,
		);
	});

	it("does not show an error on blur when address field is empty", async () => {
		const user = userEvent.setup();
		renderModal();
		await user.click(screen.getByLabelText(/stellar address/i));
		await user.tab();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("clears the error when the user starts typing again", async () => {
		const user = userEvent.setup();
		renderModal();
		await user.click(screen.getByRole("button", { name: /add wallet/i }));
		expect(await screen.findByRole("alert")).toBeInTheDocument();
		await user.type(screen.getByLabelText(/stellar address/i), "G");
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});
});

// ─── Duplicate address detection ──────────────────────────────────────────────

describe("AddWalletModal duplicate address detection", () => {
	it("shows an error on submit when address is already in existingAddresses", async () => {
		const user = userEvent.setup();
		renderModal({ existingAddresses: [VALID_ADDRESS] });
		await user.type(screen.getByLabelText(/stellar address/i), VALID_ADDRESS);
		await user.click(screen.getByRole("button", { name: /add wallet/i }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			/already been added/i,
		);
	});

	it("shows duplicate error on blur after typing a known address", async () => {
		const user = userEvent.setup();
		renderModal({ existingAddresses: [VALID_ADDRESS] });
		await user.type(screen.getByLabelText(/stellar address/i), VALID_ADDRESS);
		await user.tab();
		expect(await screen.findByRole("alert")).toHaveTextContent(
			/already been added/i,
		);
	});

	it("accepts a valid address that is not in existingAddresses", async () => {
		const user = userEvent.setup();
		const { onAdd } = renderModal({
			existingAddresses: [ANOTHER_VALID_ADDRESS],
		});
		await user.type(screen.getByLabelText(/stellar address/i), VALID_ADDRESS);
		await user.click(screen.getByRole("button", { name: /add wallet/i }));
		await waitFor(() =>
			expect(
				screen.getByText(/wallet added successfully/i),
			).toBeInTheDocument(),
		);
		expect(onAdd).toHaveBeenCalledOnce();
	});

	it("does not call onAdd when address is a duplicate", async () => {
		const user = userEvent.setup();
		const { onAdd } = renderModal({ existingAddresses: [VALID_ADDRESS] });
		await user.type(screen.getByLabelText(/stellar address/i), VALID_ADDRESS);
		await user.click(screen.getByRole("button", { name: /add wallet/i }));
		await screen.findByRole("alert");
		expect(onAdd).not.toHaveBeenCalled();
	});

	it("works correctly when existingAddresses is empty", async () => {
		const user = userEvent.setup();
		const { onAdd } = renderModal({ existingAddresses: [] });
		await user.type(screen.getByLabelText(/stellar address/i), VALID_ADDRESS);
		await user.click(screen.getByRole("button", { name: /add wallet/i }));
		await waitFor(() =>
			expect(
				screen.getByText(/wallet added successfully/i),
			).toBeInTheDocument(),
		);
		expect(onAdd).toHaveBeenCalledOnce();
	});
});

// ─── Label validation ─────────────────────────────────────────────────────────

describe("AddWalletModal label validation", () => {
	it("allows submitting without a label (label is optional)", async () => {
		const user = userEvent.setup();
		const { onAdd } = renderModal();
		await user.type(screen.getByLabelText(/stellar address/i), VALID_ADDRESS);
		await user.click(screen.getByRole("button", { name: /add wallet/i }));
		await waitFor(() =>
			expect(
				screen.getByText(/wallet added successfully/i),
			).toBeInTheDocument(),
		);
		expect(onAdd.mock.calls[0][0].label).toBeUndefined();
	});

	it("shows an error when label exceeds 30 characters", async () => {
		const user = userEvent.setup();
		renderModal();
		await user.type(screen.getByLabelText(/label/i), "A".repeat(31));
		await user.tab();
		expect(
			await screen.findByText(/30 characters or less/i),
		).toBeInTheDocument();
	});

	it("blocks submission when label exceeds 30 characters", async () => {
		const user = userEvent.setup();
		const { onAdd } = renderModal();
		await user.type(screen.getByLabelText(/stellar address/i), VALID_ADDRESS);
		await user.type(screen.getByLabelText(/label/i), "A".repeat(31));
		await user.click(screen.getByRole("button", { name: /add wallet/i }));
		expect(
			await screen.findByText(/30 characters or less/i),
		).toBeInTheDocument();
		expect(onAdd).not.toHaveBeenCalled();
	});

	it("shows an error when label contains invalid characters", async () => {
		const user = userEvent.setup();
		renderModal();
		await user.type(screen.getByLabelText(/label/i), "My <Wallet>");
		await user.tab();
		expect(await screen.findByText(/invalid characters/i)).toBeInTheDocument();
	});

	it("blocks submission when label contains invalid characters", async () => {
		const user = userEvent.setup();
		const { onAdd } = renderModal();
		await user.type(screen.getByLabelText(/stellar address/i), VALID_ADDRESS);
		await user.type(screen.getByLabelText(/label/i), 'My "wallet"');
		await user.click(screen.getByRole("button", { name: /add wallet/i }));
		expect(await screen.findByText(/invalid characters/i)).toBeInTheDocument();
		expect(onAdd).not.toHaveBeenCalled();
	});

	it("accepts a valid label and passes it to onAdd", async () => {
		const user = userEvent.setup();
		const { onAdd } = renderModal();
		await user.type(screen.getByLabelText(/stellar address/i), VALID_ADDRESS);
		await user.type(screen.getByLabelText(/label/i), "My Main Wallet");
		await user.click(screen.getByRole("button", { name: /add wallet/i }));
		await waitFor(() =>
			expect(
				screen.getByText(/wallet added successfully/i),
			).toBeInTheDocument(),
		);
		expect(onAdd.mock.calls[0][0].label).toBe("My Main Wallet");
	});

	it("shows the label in the success summary when provided", async () => {
		const user = userEvent.setup();
		renderModal();
		await user.type(screen.getByLabelText(/stellar address/i), VALID_ADDRESS);
		await user.type(screen.getByLabelText(/label/i), "My Main Wallet");
		await user.click(screen.getByRole("button", { name: /add wallet/i }));
		await waitFor(() =>
			expect(
				screen.getByText(/wallet added successfully/i),
			).toBeInTheDocument(),
		);
		expect(screen.getByText("My Main Wallet")).toBeInTheDocument();
	});

	it("omits label from success summary when not provided", async () => {
		const user = userEvent.setup();
		renderModal();
		await user.type(screen.getByLabelText(/stellar address/i), VALID_ADDRESS);
		await user.click(screen.getByRole("button", { name: /add wallet/i }));
		await waitFor(() =>
			expect(
				screen.getByText(/wallet added successfully/i),
			).toBeInTheDocument(),
		);
		expect(screen.queryByText(/^Label$/i)).not.toBeInTheDocument();
	});

	it("clears label error when user starts typing", async () => {
		const user = userEvent.setup();
		renderModal();
		await user.type(screen.getByLabelText(/label/i), "My <bad>");
		await user.tab();
		expect(await screen.findByText(/invalid characters/i)).toBeInTheDocument();
		await user.type(screen.getByLabelText(/label/i), "x");
		expect(screen.queryByText(/invalid characters/i)).not.toBeInTheDocument();
	});
});

// ─── Character count ──────────────────────────────────────────────────────────

describe("AddWalletModal character count", () => {
	it("shows no character count when address is empty", () => {
		renderModal();
		expect(screen.queryByTestId("char-count")).not.toBeInTheDocument();
	});

	it("shows the character count while typing", async () => {
		const user = userEvent.setup();
		renderModal();
		await user.type(screen.getByLabelText(/stellar address/i), "GABC");
		const counter = screen.getByTestId("char-count");
		expect(counter).toHaveTextContent("4/56");
	});

	it("shows 56/56 when a complete valid address is entered", async () => {
		const user = userEvent.setup();
		renderModal();
		await user.type(screen.getByLabelText(/stellar address/i), VALID_ADDRESS);
		const counter = screen.getByTestId("char-count");
		expect(counter).toHaveTextContent("56/56");
	});

	it("resets character count after form is reset via Add Another", async () => {
		const user = userEvent.setup();
		renderModal();
		await user.type(screen.getByLabelText(/stellar address/i), VALID_ADDRESS);
		await user.click(screen.getByRole("button", { name: /add wallet/i }));
		await waitFor(() =>
			expect(
				screen.getByText(/wallet added successfully/i),
			).toBeInTheDocument(),
		);
		await user.click(screen.getByRole("button", { name: /add another/i }));
		expect(screen.queryByTestId("char-count")).not.toBeInTheDocument();
	});
});

// ─── Successful submission ────────────────────────────────────────────────────

describe("AddWalletModal successful submission", () => {
	it("calls onAdd with a new wallet and shows success state", async () => {
		const user = userEvent.setup();
		const { onAdd } = renderModal();

		await user.type(screen.getByLabelText(/stellar address/i), VALID_ADDRESS);
		await user.click(screen.getByRole("button", { name: /add wallet/i }));

		await waitFor(() =>
			expect(
				screen.getByText(/wallet added successfully/i),
			).toBeInTheDocument(),
		);

		expect(onAdd).toHaveBeenCalledOnce();
		const wallet = onAdd.mock.calls[0][0];
		expect(wallet.address).toBe(VALID_ADDRESS);
		expect(wallet.network).toBe("mainnet");
		expect(wallet.status).toBe("pending");
	});

	it("shows the correct network in the success summary", async () => {
		const user = userEvent.setup();
		renderModal();

		await user.type(screen.getByLabelText(/stellar address/i), VALID_ADDRESS);
		await user.selectOptions(screen.getByLabelText(/network/i), "testnet");
		await user.click(screen.getByRole("button", { name: /add wallet/i }));

		await waitFor(() =>
			expect(
				screen.getByText(/wallet added successfully/i),
			).toBeInTheDocument(),
		);

		expect(screen.getByText("testnet")).toBeInTheDocument();
	});

	it("resets the form when 'Add Another' is clicked", async () => {
		const user = userEvent.setup();
		renderModal();

		await user.type(screen.getByLabelText(/stellar address/i), VALID_ADDRESS);
		await user.click(screen.getByRole("button", { name: /add wallet/i }));
		await waitFor(() =>
			expect(
				screen.getByText(/wallet added successfully/i),
			).toBeInTheDocument(),
		);

		await user.click(screen.getByRole("button", { name: /add another/i }));

		expect(screen.getByLabelText(/stellar address/i)).toBeInTheDocument();
		expect(
			(screen.getByLabelText(/stellar address/i) as HTMLInputElement).value,
		).toBe("");
		expect((screen.getByLabelText(/label/i) as HTMLInputElement).value).toBe(
			"",
		);
	});
});

// ─── Close / cancel ───────────────────────────────────────────────────────────

describe("AddWalletModal close behaviour", () => {
	it("calls onClose when Cancel is clicked", async () => {
		const user = userEvent.setup();
		const { onClose } = renderModal();
		await user.click(screen.getByRole("button", { name: /cancel/i }));
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("calls onClose when the X button is clicked", async () => {
		const user = userEvent.setup();
		const { onClose } = renderModal();
		await user.click(screen.getByRole("button", { name: /close dialog/i }));
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("calls onClose when the backdrop is clicked", async () => {
		const user = userEvent.setup();
		const { onClose } = renderModal();
		const backdrop = document.querySelector(
			'[aria-hidden="true"]',
		) as HTMLElement;
		await user.click(backdrop);
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("calls onClose when Escape is pressed", async () => {
		const user = userEvent.setup();
		const { onClose } = renderModal();
		await user.keyboard("{Escape}");
		expect(onClose).toHaveBeenCalledOnce();
	});
});
