import type { Meta, StoryObj } from "@storybook/react";
import { CopyButton } from "./CopyButton";

/**
 * CopyButton provides copy-to-clipboard functionality with visual feedback.
 * 
 * Features:
 * - Copy icon (default state)
 * - Check icon (success state, 2 seconds)
 * - Error icon (failure state)
 * - Hover scale animation
 * - Optional success/error callbacks
 * - Configurable sizes (icon-sm, sm, default)
 * - Accessibility compliant with ARIA labels
 * - Dark mode support
 * 
 * States:
 * - Default: Copy icon, ready to copy
 * - Copied: Check icon, green color
 * - Error: Alert icon, red color
 * 
 * Use cases:
 * - Copy wallet addresses
 * - Copy transaction hashes
 * - Copy metric values
 * - Copy asset symbols
 */
const meta = {
	title: "Analytics/CopyButton",
	component: CopyButton,
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Reusable copy-to-clipboard button with visual feedback states and accessibility support.",
			},
		},
	},
	argTypes: {
		text: {
			description: "Text to copy to clipboard",
			control: "text",
		},
		label: {
			description: "Accessible label for screen readers",
			control: "text",
		},
		onCopySuccess: {
			description: "Optional callback when copy succeeds",
		},
		onCopyError: {
			description: "Optional callback when copy fails",
		},
		size: {
			description: "Button size variant",
			control: "select",
			options: ["icon-sm", "sm", "default"],
		},
		className: {
			description: "Optional additional CSS classes",
			control: "text",
		},
	},
} satisfies Meta<typeof CopyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default state - ready to copy simple text */
export const Default: Story = {
	args: {
		text: "Copy this text",
		label: "Copy to clipboard",
		onCopySuccess: (text) => console.log("Copied:", text),
		onCopyError: (error) => console.error("Copy failed:", error),
	},
};

/** Small size - icon-sm variant */
export const SmallSize: Story = {
	args: {
		text: "Small button text",
		label: "Copy small text",
		size: "icon-sm",
		onCopySuccess: (text) => console.log("Copied:", text),
	},
};

/** Medium size - sm variant */
export const MediumSize: Story = {
	args: {
		text: "Medium button text",
		label: "Copy medium text",
		size: "sm",
		onCopySuccess: (text) => console.log("Copied:", text),
	},
};

/** Large size - default variant */
export const LargeSize: Story = {
	args: {
		text: "Large button text",
		label: "Copy large text",
		size: "default",
		onCopySuccess: (text) => console.log("Copied:", text),
	},
};

/** Copy wallet address */
export const WalletAddress: Story = {
	args: {
		text: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
		label: "Copy wallet address",
		size: "icon-sm",
		onCopySuccess: (text) => console.log("Address copied:", text),
	},
};

/** Copy transaction hash */
export const TransactionHash: Story = {
	args: {
		text: "0x8f5e7d8c9a1b2e3f4d5c6a7b8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
		label: "Copy transaction hash",
		size: "icon-sm",
		onCopySuccess: (text) => console.log("Hash copied:", text),
	},
};

/** Copy currency value */
export const CurrencyValue: Story = {
	args: {
		text: "$12,456.78",
		label: "Copy amount",
		size: "icon-sm",
		onCopySuccess: (text) => console.log("Amount copied:", text),
	},
};

/** Copy asset symbol */
export const AssetSymbol: Story = {
	args: {
		text: "MUX",
		label: "Copy asset symbol",
		size: "icon-sm",
		onCopySuccess: (text) => console.log("Symbol copied:", text),
	},
};

/** Copy percentage */
export const Percentage: Story = {
	args: {
		text: "15.2%",
		label: "Copy percentage change",
		size: "icon-sm",
		onCopySuccess: (text) => console.log("Percentage copied:", text),
	},
};

/** Copy large number */
export const LargeNumber: Story = {
	args: {
		text: "84,231,567",
		label: "Copy transaction count",
		size: "icon-sm",
		onCopySuccess: (text) => console.log("Count copied:", text),
	},
};

/** Copy email address */
export const EmailAddress: Story = {
	args: {
		text: "support@muxprotocol.com",
		label: "Copy email address",
		size: "icon-sm",
		onCopySuccess: (text) => console.log("Email copied:", text),
	},
};

/** Copy URL */
export const URL: Story = {
	args: {
		text: "https://muxprotocol.com/analytics/dashboard",
		label: "Copy URL",
		size: "icon-sm",
		onCopySuccess: (text) => console.log("URL copied:", text),
	},
};

/** Copy JSON data */
export const JSONData: Story = {
	args: {
		text: JSON.stringify(
			{
				asset: "MUX",
				volume: "$4,234,567",
				change: 15.2,
			},
			null,
			2,
		),
		label: "Copy JSON data",
		size: "sm",
		onCopySuccess: (text) => console.log("JSON copied:", text),
	},
};

/** Copy multi-line text */
export const MultiLineText: Story = {
	args: {
		text: "Line 1: Total Volume: $12.4M\nLine 2: Transactions: 84,231\nLine 3: Active Wallets: 3,842",
		label: "Copy report",
		size: "sm",
		onCopySuccess: (text) => console.log("Report copied:", text),
	},
};

/** With custom styling */
export const CustomStyling: Story = {
	args: {
		text: "Custom styled button",
		label: "Copy text",
		size: "sm",
		className: "text-blue-600 hover:text-blue-800",
		onCopySuccess: (text) => console.log("Copied:", text),
	},
};

/** With success callback */
export const WithSuccessCallback: Story = {
	args: {
		text: "Text with success callback",
		label: "Copy text",
		size: "icon-sm",
		onCopySuccess: (text) => {
			console.log("Success! Copied:", text);
			alert(`Successfully copied: ${text}`);
		},
	},
};

/** With error callback */
export const WithErrorCallback: Story = {
	args: {
		text: "Text with error callback",
		label: "Copy text",
		size: "icon-sm",
		onCopyError: (error) => {
			console.error("Error:", error);
			alert(`Copy failed: ${error}`);
		},
	},
};
