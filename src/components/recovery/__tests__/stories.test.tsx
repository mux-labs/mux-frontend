/**
 * Snapshot / render tests for Storybook stories.
 *
 * Each test renders the story's exported component with its args to verify
 * the story mounts without errors — a lightweight sanity check that stories
 * stay in sync with the components they document.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// RecoveryStatus stories
import {
	Active,
	AllStatuses,
	Disconnected,
	ErrorStatus,
	Monitoring,
	Ready,
	Unknown,
} from "../RecoveryStatus.stories";
import { RecoveryStatus } from "../RecoveryStatus";

// RecoveryDocsLink stories
import {
	CustomHref,
	CustomLabel,
	Default as DocsLinkDefault,
} from "../RecoveryDocsLink.stories";
import { RecoveryDocsLink } from "../RecoveryDocsLink";

// RecoveryFAQ stories
import {
	CustomItems,
	Default as FAQDefault,
	Empty,
	SingleItem,
} from "../RecoveryFAQ.stories";
import { RecoveryFAQ } from "../RecoveryFAQ";

// InitiateRecoveryCTA stories
import {
	Confirming,
	Idle,
	Pending,
	Success,
	WithError,
} from "../InitiateRecoveryCTA.stories";
import { InitiateRecoveryCTA } from "../InitiateRecoveryCTA";

// ---------------------------------------------------------------------------
// RecoveryStatus stories
// ---------------------------------------------------------------------------
describe("RecoveryStatus stories", () => {
	it("Active story renders active badge", () => {
		render(<RecoveryStatus {...Active.args} />);
		expect(
			screen.getByLabelText(/recovery status: active/i),
		).toBeInTheDocument();
	});

	it("Monitoring story renders monitoring badge", () => {
		render(<RecoveryStatus {...Monitoring.args} />);
		expect(screen.getByLabelText(/monitoring/i)).toBeInTheDocument();
	});

	it("Ready story renders ready badge", () => {
		render(<RecoveryStatus {...Ready.args} />);
		expect(screen.getByLabelText(/ready/i)).toBeInTheDocument();
	});

	it("ErrorStatus story renders error badge", () => {
		render(<RecoveryStatus {...ErrorStatus.args} />);
		expect(screen.getByLabelText(/error/i)).toBeInTheDocument();
	});

	it("Disconnected story renders disconnected badge", () => {
		render(<RecoveryStatus {...Disconnected.args} />);
		expect(screen.getByLabelText(/disconnected/i)).toBeInTheDocument();
	});

	it("Unknown story renders unknown badge", () => {
		render(<RecoveryStatus {...Unknown.args} />);
		expect(screen.getByLabelText(/unknown/i)).toBeInTheDocument();
	});

	it("AllStatuses story renders all six badges", () => {
		if (AllStatuses.render) {
			render(<>{AllStatuses.render({} as never)}</>);
		}
		// Each badge has an aria-label "Recovery status: <value>"
		const badges = screen.getAllByLabelText(/recovery status:/i);
		expect(badges.length).toBe(6);
	});
});

// ---------------------------------------------------------------------------
// RecoveryDocsLink stories
// ---------------------------------------------------------------------------
describe("RecoveryDocsLink stories", () => {
	it("Default story renders a link to the docs", () => {
		render(<RecoveryDocsLink {...DocsLinkDefault.args} />);
		expect(
			screen.getByRole("link", { name: /read recovery documentation/i }),
		).toBeInTheDocument();
	});

	it("CustomLabel story renders the custom label", () => {
		render(<RecoveryDocsLink {...CustomLabel.args} />);
		expect(screen.getByText("View Recovery Guide")).toBeInTheDocument();
	});

	it("CustomHref story renders a link with a custom href", () => {
		render(<RecoveryDocsLink {...CustomHref.args} />);
		const link = screen.getByRole("link");
		expect(link).toHaveAttribute(
			"href",
			"https://docs.mux.network/guides/recovery",
		);
	});
});

// ---------------------------------------------------------------------------
// RecoveryFAQ stories
// ---------------------------------------------------------------------------
describe("RecoveryFAQ stories", () => {
	it("Default story renders the FAQ section heading", () => {
		render(<RecoveryFAQ {...FAQDefault.args} />);
		expect(
			screen.getByRole("heading", { name: /frequently asked questions/i }),
		).toBeInTheDocument();
	});

	it("CustomItems story renders custom FAQ items", () => {
		render(<RecoveryFAQ {...CustomItems.args} />);
		expect(
			screen.getByText(/what happens to my funds during recovery/i),
		).toBeInTheDocument();
	});

	it("Empty story renders the empty fallback message", () => {
		render(<RecoveryFAQ {...Empty.args} />);
		expect(screen.getByText(/no faq items available/i)).toBeInTheDocument();
	});

	it("SingleItem story renders exactly one FAQ question", () => {
		render(<RecoveryFAQ {...SingleItem.args} />);
		expect(screen.getAllByRole("listitem").length).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// InitiateRecoveryCTA stories
// ---------------------------------------------------------------------------
describe("InitiateRecoveryCTA stories", () => {
	it("Idle story renders the primary CTA button", () => {
		render(<InitiateRecoveryCTA {...Idle.args!} />);
		expect(
			screen.getByRole("button", { name: /initiate recovery/i }),
		).toBeInTheDocument();
	});

	it("Confirming story renders the confirmation dialog", () => {
		render(<InitiateRecoveryCTA {...Confirming.args!} />);
		expect(
			screen.getByRole("button", { name: /yes, initiate recovery/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
	});

	it("Pending story renders the loading spinner", () => {
		render(<InitiateRecoveryCTA {...Pending.args!} />);
		expect(
			screen.getByText(/submitting recovery request/i),
		).toBeInTheDocument();
	});

	it("Success story renders the success confirmation", () => {
		render(<InitiateRecoveryCTA {...Success.args!} />);
		expect(screen.getByText(/recovery initiated/i)).toBeInTheDocument();
	});

	it("WithError story renders the error message inline", () => {
		render(<InitiateRecoveryCTA {...WithError.args!} />);
		expect(screen.getByText(/network timeout/i)).toBeInTheDocument();
	});
});
