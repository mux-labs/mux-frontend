/**
 * Storybook stories for InitiateRecoveryCTA (CSF3 format).
 *
 * Each story fixes the recovery state machine at a specific step so the CTA
 * can be previewed in isolation without a running backend.
 *
 * Run with: `pnpm storybook` (after installing @storybook/react).
 */
import type { ComponentProps } from "react";
import type { UseRecoveryReturn } from "@/hooks/useRecovery";
import { InitiateRecoveryCTA } from "./InitiateRecoveryCTA";

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
// Helpers
// ---------------------------------------------------------------------------
function noop(): void {}
function noopAsync(): Promise<void> {
	return Promise.resolve();
}

function makeRecovery(
	overrides: Partial<UseRecoveryReturn> = {},
): UseRecoveryReturn {
	return {
		state: "idle",
		errorMessage: null,
		initiateRecovery: noop,
		confirmRecovery: noopAsync,
		cancelRecovery: noop,
		resetRecovery: noop,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------
const meta: StoryMeta<typeof InitiateRecoveryCTA> = {
	title: "Recovery/InitiateRecoveryCTA",
	component: InitiateRecoveryCTA,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"CTA card that drives the recovery state machine. Renders different UI for each state: idle, confirming, pending, success, and error.",
			},
		},
	},
};

export default meta;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------
export const Idle: Story<typeof InitiateRecoveryCTA> = {
	args: { recovery: makeRecovery({ state: "idle" }) },
};

export const Confirming: Story<typeof InitiateRecoveryCTA> = {
	args: { recovery: makeRecovery({ state: "confirming" }) },
};

export const Pending: Story<typeof InitiateRecoveryCTA> = {
	args: { recovery: makeRecovery({ state: "pending" }) },
};

export const Success: Story<typeof InitiateRecoveryCTA> = {
	args: { recovery: makeRecovery({ state: "success" }) },
};

export const WithError: Story<typeof InitiateRecoveryCTA> = {
	name: "Error state",
	args: {
		recovery: makeRecovery({
			state: "error",
			errorMessage: "Network timeout. Please try again.",
		}),
	},
};
