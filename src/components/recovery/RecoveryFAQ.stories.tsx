/**
 * Storybook stories for RecoveryFAQ (CSF3 format).
 *
 * Demonstrates the accordion FAQ in its default state, with custom items,
 * with an empty list, and with a single item — covering edge cases.
 *
 * Run with: `pnpm storybook` (after installing @storybook/react).
 */
import type { ComponentProps } from "react";
import { FAQ_ITEMS, RecoveryFAQ } from "./RecoveryFAQ";

// ---------------------------------------------------------------------------
// Minimal CSF type shims — replace with @storybook/react imports once
// Storybook is added to the project.
// ---------------------------------------------------------------------------
type StoryMeta<C extends React.ElementType> = {
	title: string;
	component: C;
	parameters?: Record<string, unknown>;
};

type Story<C extends React.ElementType> = {
	args?: Partial<ComponentProps<C>>;
	name?: string;
};

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------
const meta: StoryMeta<typeof RecoveryFAQ> = {
	title: "Recovery/RecoveryFAQ",
	component: RecoveryFAQ,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Accordion FAQ section for the recovery page. Items are independently expandable. Accepts a custom items array for testing or custom content.",
			},
		},
	},
};

export default meta;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------
export const Default: Story<typeof RecoveryFAQ> = {};

export const CustomItems: Story<typeof RecoveryFAQ> = {
	args: {
		items: [
			{
				id: "custom-1",
				question: "What happens to my funds during recovery?",
				answer:
					"Your funds remain fully secure and inaccessible to anyone else throughout the recovery process.",
			},
			{
				id: "custom-2",
				question: "Do I need a seed phrase?",
				answer:
					"No. Invisible wallet recovery never requires a seed phrase — the process is handled entirely by secure backend systems.",
			},
		],
	},
};

export const Empty: Story<typeof RecoveryFAQ> = {
	args: { items: [] },
};

export const SingleItem: Story<typeof RecoveryFAQ> = {
	args: { items: [FAQ_ITEMS[0]] },
};
