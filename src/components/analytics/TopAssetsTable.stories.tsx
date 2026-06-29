import type { Meta, StoryObj } from "@storybook/react";
import { TopAssetsTable } from "./TopAssetsTable";
import type { AssetData } from "@/mock-data/analytics";

/**
 * TopAssetsTable displays the highest traded assets on the platform.
 * 
 * Features:
 * - Responsive table that hides optional columns on smaller screens
 * - Copy-to-clipboard functionality for symbols, volumes, and TVL values
 * - Color-coded change indicators (green for positive, red for negative)
 * - Avatar badges with asset initials
 * - Toast feedback when copying values
 * - Hover state that reveals copy buttons
 * 
 * Columns:
 * - Rank (always visible)
 * - Asset (name + symbol, always visible)
 * - Volume (always visible)
 * - Change percentage (hidden on xs screens)
 * - TVL - Total Value Locked (hidden below md)
 * - Transaction count (hidden below md)
 */
const meta = {
	title: "Analytics/TopAssetsTable",
	component: TopAssetsTable,
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Displays a ranked table of the highest traded assets with volume metrics, change indicators, and copy functionality.",
			},
		},
	},
	argTypes: {
		assets: {
			description: "Array of asset data objects to display in the table",
			control: "object",
		},
	},
} satisfies Meta<typeof TopAssetsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default top 5 assets from mock data */
export const Default: Story = {
	args: {
		assets: [
			{
				rank: 1,
				name: "Mux Protocol",
				symbol: "MUX",
				volume: "$4,234,567",
				volumeChange: 15.2,
				tvl: "$18.2M",
				txCount: 28432,
			},
			{
				rank: 2,
				name: "Stellar",
				symbol: "XLM",
				volume: "$3,456,789",
				volumeChange: 8.7,
				tvl: "$12.8M",
				txCount: 21890,
			},
			{
				rank: 3,
				name: "USDC",
				symbol: "USDC",
				volume: "$2,345,678",
				volumeChange: -3.1,
				tvl: "$45.6M",
				txCount: 15678,
			},
			{
				rank: 4,
				name: "Ethereum",
				symbol: "ETH",
				volume: "$1,234,567",
				volumeChange: 5.4,
				tvl: "$8.9M",
				txCount: 10234,
			},
			{
				rank: 5,
				name: "Bitcoin",
				symbol: "BTC",
				volume: "$987,654",
				volumeChange: -1.8,
				tvl: "$6.7M",
				txCount: 5678,
			},
		],
	},
};

/** All assets with positive volume changes - bullish market */
export const AllPositive: Story = {
	args: {
		assets: [
			{
				rank: 1,
				name: "Mux Protocol",
				symbol: "MUX",
				volume: "$8,456,789",
				volumeChange: 45.7,
				tvl: "$32.4M",
				txCount: 52340,
			},
			{
				rank: 2,
				name: "Stellar",
				symbol: "XLM",
				volume: "$6,234,567",
				volumeChange: 32.3,
				tvl: "$28.1M",
				txCount: 41230,
			},
			{
				rank: 3,
				name: "Ethereum",
				symbol: "ETH",
				volume: "$4,567,890",
				volumeChange: 28.9,
				tvl: "$21.5M",
				txCount: 35890,
			},
		],
	},
};

/** All assets with negative volume changes - bearish market */
export const AllNegative: Story = {
	args: {
		assets: [
			{
				rank: 1,
				name: "Bitcoin",
				symbol: "BTC",
				volume: "$1,234,567",
				volumeChange: -18.4,
				tvl: "$12.3M",
				txCount: 8234,
			},
			{
				rank: 2,
				name: "Ethereum",
				symbol: "ETH",
				volume: "$987,654",
				volumeChange: -22.1,
				tvl: "$9.8M",
				txCount: 6543,
			},
			{
				rank: 3,
				name: "USDC",
				symbol: "USDC",
				volume: "$654,321",
				volumeChange: -5.7,
				tvl: "$45.2M",
				txCount: 4321,
			},
		],
	},
};

/** Single asset */
export const SingleAsset: Story = {
	args: {
		assets: [
			{
				rank: 1,
				name: "Mux Protocol",
				symbol: "MUX",
				volume: "$4,234,567",
				volumeChange: 15.2,
				tvl: "$18.2M",
				txCount: 28432,
			},
		],
	},
};

/** Top 10 assets - more comprehensive view */
export const Top10: Story = {
	args: {
		assets: [
			{
				rank: 1,
				name: "Mux Protocol",
				symbol: "MUX",
				volume: "$4,234,567",
				volumeChange: 15.2,
				tvl: "$18.2M",
				txCount: 28432,
			},
			{
				rank: 2,
				name: "Stellar",
				symbol: "XLM",
				volume: "$3,456,789",
				volumeChange: 8.7,
				tvl: "$12.8M",
				txCount: 21890,
			},
			{
				rank: 3,
				name: "USDC",
				symbol: "USDC",
				volume: "$2,345,678",
				volumeChange: -3.1,
				tvl: "$45.6M",
				txCount: 15678,
			},
			{
				rank: 4,
				name: "Ethereum",
				symbol: "ETH",
				volume: "$1,234,567",
				volumeChange: 5.4,
				tvl: "$8.9M",
				txCount: 10234,
			},
			{
				rank: 5,
				name: "Bitcoin",
				symbol: "BTC",
				volume: "$987,654",
				volumeChange: -1.8,
				tvl: "$6.7M",
				txCount: 5678,
			},
			{
				rank: 6,
				name: "Cardano",
				symbol: "ADA",
				volume: "$876,543",
				volumeChange: 12.3,
				tvl: "$5.4M",
				txCount: 4567,
			},
			{
				rank: 7,
				name: "Solana",
				symbol: "SOL",
				volume: "$765,432",
				volumeChange: -6.2,
				tvl: "$4.2M",
				txCount: 3456,
			},
			{
				rank: 8,
				name: "Polkadot",
				symbol: "DOT",
				volume: "$654,321",
				volumeChange: 9.8,
				tvl: "$3.8M",
				txCount: 2987,
			},
			{
				rank: 9,
				name: "Avalanche",
				symbol: "AVAX",
				volume: "$543,210",
				volumeChange: -4.5,
				tvl: "$3.1M",
				txCount: 2345,
			},
			{
				rank: 10,
				name: "Chainlink",
				symbol: "LINK",
				volume: "$432,109",
				volumeChange: 7.6,
				tvl: "$2.9M",
				txCount: 1987,
			},
		],
	},
};

/** Large volumes - testing formatting for billions */
export const LargeVolumes: Story = {
	args: {
		assets: [
			{
				rank: 1,
				name: "Bitcoin",
				symbol: "BTC",
				volume: "$1.2B",
				volumeChange: 23.4,
				tvl: "$456.8M",
				txCount: 1234567,
			},
			{
				rank: 2,
				name: "Ethereum",
				symbol: "ETH",
				volume: "$987.6M",
				volumeChange: 18.9,
				tvl: "$345.2M",
				txCount: 987654,
			},
			{
				rank: 3,
				name: "USDT",
				symbol: "USDT",
				volume: "$876.5M",
				volumeChange: 5.3,
				tvl: "$2.1B",
				txCount: 876543,
			},
		],
	},
};

/** Small volumes - niche/emerging assets */
export const SmallVolumes: Story = {
	args: {
		assets: [
			{
				rank: 1,
				name: "New Token A",
				symbol: "NTA",
				volume: "$12,345",
				volumeChange: 234.5,
				tvl: "$45,678",
				txCount: 89,
			},
			{
				rank: 2,
				name: "Emerging Coin B",
				symbol: "ECB",
				volume: "$8,901",
				volumeChange: 156.7,
				tvl: "$23,456",
				txCount: 67,
			},
			{
				rank: 3,
				name: "Test Token C",
				symbol: "TTC",
				volume: "$5,678",
				volumeChange: -34.2,
				tvl: "$12,345",
				txCount: 45,
			},
		],
	},
};

/** Stablecoins only - low volatility */
export const Stablecoins: Story = {
	args: {
		assets: [
			{
				rank: 1,
				name: "USDC",
				symbol: "USDC",
				volume: "$12,345,678",
				volumeChange: 0.3,
				tvl: "$456.8M",
				txCount: 123456,
			},
			{
				rank: 2,
				name: "Tether",
				symbol: "USDT",
				volume: "$10,234,567",
				volumeChange: -0.1,
				tvl: "$389.2M",
				txCount: 98765,
			},
			{
				rank: 3,
				name: "DAI",
				symbol: "DAI",
				volume: "$5,678,901",
				volumeChange: 0.5,
				tvl: "$234.5M",
				txCount: 56789,
			},
		],
	},
};

/** Empty state - no assets to display */
export const Empty: Story = {
	args: {
		assets: [],
	},
};
