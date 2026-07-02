import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { AddWalletModal } from "./AddWalletModal";

const VALID_ADDRESS =
	"GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
const EXISTING_ADDRESS =
	"GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE";

const meta: Meta<typeof AddWalletModal> = {
	title: "Wallet/AddWalletModal",
	component: AddWalletModal,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
	argTypes: {
		isOpen: {
			control: "boolean",
			description: "Controls modal visibility",
		},
		existingAddresses: {
			control: false,
			description: "Already registered addresses used for duplicate detection",
		},
	},
	args: {
		isOpen: true,
		onClose: fn(),
		onAdd: fn(),
		existingAddresses: [],
	},
};

export default meta;
type Story = StoryObj<typeof AddWalletModal>;

// ─── Static states ────────────────────────────────────────────────────────────

export const FormStep: Story = {
	name: "Form step (empty)",
	args: {
		isOpen: true,
	},
};

export const Closed: Story = {
	args: {
		isOpen: false,
	},
};

export const WithExistingAddresses: Story = {
	name: "Form step (duplicate guard active)",
	args: {
		existingAddresses: [EXISTING_ADDRESS],
	},
};

// ─── Interaction stories ──────────────────────────────────────────────────────

export const AddressValidationError: Story = {
	name: "Address validation error",
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const user = userEvent.setup();

		await user.type(canvas.getByLabelText(/stellar address/i), "GABC");
		await user.click(canvas.getByRole("button", { name: /add wallet/i }));

		await waitFor(() => expect(canvas.getByRole("alert")).toBeInTheDocument());
	},
};

export const DuplicateAddressError: Story = {
	name: "Duplicate address error",
	args: {
		existingAddresses: [VALID_ADDRESS],
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const user = userEvent.setup();

		await user.type(canvas.getByLabelText(/stellar address/i), VALID_ADDRESS);
		await user.click(canvas.getByRole("button", { name: /add wallet/i }));

		await waitFor(() =>
			expect(canvas.getByRole("alert")).toHaveTextContent(
				/already been added/i,
			),
		);
	},
};

export const SuccessStep: Story = {
	name: "Success step",
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const user = userEvent.setup();

		await user.type(canvas.getByLabelText(/stellar address/i), VALID_ADDRESS);
		await user.type(canvas.getByLabelText(/label/i), "My Main Wallet");
		await user.click(canvas.getByRole("button", { name: /add wallet/i }));

		await waitFor(
			() =>
				expect(
					canvas.getByText(/wallet added successfully/i),
				).toBeInTheDocument(),
			{ timeout: 3000 },
		);
	},
};

export const TestnetNetwork: Story = {
	name: "Testnet network selected",
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const user = userEvent.setup();

		await user.selectOptions(canvas.getByLabelText(/network/i), "testnet");
		await user.type(canvas.getByLabelText(/stellar address/i), VALID_ADDRESS);
	},
};
