/**
 * Storybook stories for RecoveryDocsLink (CSF3 format).
 *
 * Documents the default button, a custom label variant, and a custom href
 * variant so the component can be previewed in the Storybook catalogue.
 *
 * Run with: `pnpm storybook` (after installing @storybook/react).
 */
import type { ComponentProps } from "react";
import { RecoveryDocsLink } from "./RecoveryDocsLink";

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
const meta: StoryMeta<typeof RecoveryDocsLink> = {
	title: "Recovery/RecoveryDocsLink",
	component: RecoveryDocsLink,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Anchor button that links to the recovery documentation. Opens in a new tab. Accepts a custom href and child label.",
			},
		},
	},
};

export default meta;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------
export const Default: Story<typeof RecoveryDocsLink> = {};

export const CustomLabel: Story<typeof RecoveryDocsLink> = {
	args: { children: "View Recovery Guide" },
};

export const CustomHref: Story<typeof RecoveryDocsLink> = {
	args: {
		href: "https://docs.mux.network/guides/recovery",
		children: "Full Recovery Guide",
	},
};
