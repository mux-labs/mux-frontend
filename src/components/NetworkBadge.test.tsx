import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
	contrastRatio,
	NETWORK_BADGE_STYLES,
	NetworkBadge,
} from "./NetworkBadge";

const WCAG_AA_TEXT = 4.5;

afterEach(() => {
	cleanup();
});

describe("NETWORK_BADGE_STYLES", () => {
	it.each(
		Object.entries(NETWORK_BADGE_STYLES),
	)("%s meets WCAG 2.1 AA (>= 4.5:1)", (_network, { bg, fg }) => {
		expect(contrastRatio(bg, fg)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
	});
});

describe("NetworkBadge", () => {
	it("shows the accessible fallback for an unknown network", () => {
		render(<NetworkBadge network="unknown-network" />);

		const badge = screen.getByRole("status", {
			name: "Network: Unknown network",
		});

		expect(badge).toHaveTextContent("Unknown network");
	});
});
