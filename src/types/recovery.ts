/**
 * Recovery Timeline Types
 *
 * Defines types for the wallet recovery timeline feature
 */

export type RecoveryEventType =
	| "initiated"
	| "detection"
	| "verification"
	| "processing"
	| "completion"
	| "error";

export type RecoveryEventStatus =
	| "pending"
	| "in_progress"
	| "completed"
	| "failed";

/**
 * Represents a single event in the recovery timeline
 */
export interface RecoveryTimelineEvent {
	id: string;
	type: RecoveryEventType;
	status: RecoveryEventStatus;
	title: string;
	description: string;
	timestamp: Date;
	details?: string;
	errorMessage?: string;
}

/**
 * Represents the complete recovery timeline
 */
export interface RecoveryTimeline {
	id: string;
	walletId: string;
	startedAt: Date;
	completedAt?: Date;
	status: "pending" | "in_progress" | "completed" | "failed";
	events: RecoveryTimelineEvent[];
	totalDuration?: number; // in milliseconds
}

/**
 * Props for recovery timeline components
 */
export interface RecoveryTimelineProps {
	timeline: RecoveryTimeline;
	className?: string;
	onEventClick?: (event: RecoveryTimelineEvent) => void;
}

export interface RecoveryTimelineEventProps {
	event: RecoveryTimelineEvent;
	isLast?: boolean;
	isFirst?: boolean;
	onClick?: () => void;
	className?: string;
	focused?: boolean;
	tabIndex?: number;
	onKeyDown?: (e: React.KeyboardEvent) => void;
	eventRef?: React.Ref<HTMLButtonElement>;
	testId?: string;
	onFocus?: () => void;
	onBlur?: () => void;
}

export interface RecoveryTimelineListProps {
	events: RecoveryTimelineEvent[];
	className?: string;
	onEventClick?: (event: RecoveryTimelineEvent) => void;
	emptyMessage?: string;
}
