import { render, screen } from "@testing-library/react";
import { RecoveryExplanation } from "../RecoveryExplanation";

describe("RecoveryExplanation", () => {
	it("renders the explanation text and external docs link", () => {
		render(<RecoveryExplanation />);

		expect(
			screen.getByRole("heading", {
				name: /What is Invisible Wallet Recovery\?/i,
			}),
		).toBeInTheDocument();

		const link = screen.getByRole("link", {
			name: /read recovery documentation/i,
		});

		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute("target", "_blank");
	});

	it("renders the Recovery System Status section", () => {
		render(<RecoveryExplanation />);
		expect(screen.getByText("Recovery System Status")).toBeInTheDocument();
	});
});
