/**
 * Storybook stories for RecoveryStatus (CSF3 format).
 *
 * These stories document every valid status variant so developers and designers
 * can preview the badge in isolation without navigating to the full recovery
 * page.
 *
 * Run with: `pnpm storybook` (after installing @storybook/react).
 */
import type { ComponentProps } from "react";
import { RecoveryStatus } from "./RecoveryStatus";

// ---------------------------------------------------------------------------
// Minimal CSF type shims — replace with @storybook/react imports once
// Storybook is added to the project.
// ---------------------------------------------------------------------------
type StoryMeta<C extends React.ElementType> = {
	title: string;
	component: C;
	parameters?: Record<string, unknown>;
	args?: Partial<ComponentProps<C>>;
};

type Story<C extends React.ElementType> = {
	args?: Partial<ComponentProps<C>>;
	render?: (args: ComponentProps<C>) => React.ReactNode;
	name?: string;
};

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------
const meta: StoryMeta<typeof RecoveryStatus> = {
	title: "Recovery/RecoveryStatus",
	component: RecoveryStatus,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Badge that reflects the current invisible wallet recovery system status. Renders gracefully for any unrecognised value by falling back to 'unknown'.",
			},
		},
	},
	args: { status: "active" },
};

export default meta;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------
export const Active: Story<typeof RecoveryStatus> = {
	args: { status: "active" },
};

export const Monitoring: Story<typeof RecoveryStatus> = {
	args: { status: "monitoring" },
};

export const Ready: Story<typeof RecoveryStatus> = {
	args: { status: "ready" },
};

export const ErrorStatus: Story<typeof RecoveryStatus> = {
	name: "Error",
	args: { status: "error" },
};

export const Disconnected: Story<typeof RecoveryStatus> = {
	args: { status: "disconnected" },
};

export const Unknown: Story<typeof RecoveryStatus> = {
	args: { status: "unknown" },
};

export const AllStatuses: Story<typeof RecoveryStatus> = {
	render: () => (
		<div className="flex flex-wrap gap-3">
			<RecoveryStatus status="active" />
			<RecoveryStatus status="monitoring" />
			<RecoveryStatus status="ready" />
			<RecoveryStatus status="error" />
			<RecoveryStatus status="disconnected" />
			<RecoveryStatus status="unknown" />
		</div>
	),
};
