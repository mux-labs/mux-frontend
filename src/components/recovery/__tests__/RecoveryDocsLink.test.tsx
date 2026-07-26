import { render, screen } from "@testing-library/react";
import { RecoveryDocsLink } from "../RecoveryDocsLink";

describe("RecoveryDocsLink", () => {
	it("renders correctly with default href", () => {
		render(<RecoveryDocsLink />);
		const link = screen.getByRole("link", {
			name: /read recovery documentation/i,
		});
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute("href", "https://docs.mux.network/recovery");
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener noreferrer");
	});

	it("renders correctly with custom href", () => {
		render(<RecoveryDocsLink href="https://example.com/custom-docs" />);
		const link = screen.getByRole("link", {
			name: /read recovery documentation/i,
		});
		expect(link).toHaveAttribute("href", "https://example.com/custom-docs");
	});

	it("renders correctly with custom children and className", () => {
		render(
			<RecoveryDocsLink className="custom-class">Custom Text</RecoveryDocsLink>,
		);
		const link = screen.getByRole("link", {
			name: /read recovery documentation/i,
		});

		expect(link).toHaveTextContent("Custom Text");
		expect(link).toHaveClass("custom-class");
	});
});
