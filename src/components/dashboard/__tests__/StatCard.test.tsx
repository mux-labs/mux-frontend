import { render, screen } from "@testing-library/react";
import { Wallet } from "lucide-react";
import { describe, expect, it } from "vitest";
import { StatCard } from "../StatCard";

describe("StatCard", () => {
	it("renders the title and value", () => {
		render(
			<StatCard
				title="Total Wallets"
				value={10}
				icon={<Wallet data-testid="icon" />}
			/>,
		);

		expect(screen.getByText("Total Wallets")).toBeInTheDocument();
		expect(screen.getByText("10")).toBeInTheDocument();
	});

	it("renders the description when provided", () => {
		render(
			<StatCard
				title="Failed Webhooks"
				value={4}
				description="Delivery failures requiring attention"
				icon={<Wallet />}
			/>,
		);

		expect(
			screen.getByText("Delivery failures requiring attention"),
		).toBeInTheDocument();
	});

	it("renders the trend label when provided", () => {
		render(
			<StatCard
				title="Active Wallets"
				value={6}
				trend="+2 from last week"
				icon={<Wallet />}
			/>,
		);

		expect(screen.getByText("+2 from last week")).toBeInTheDocument();
	});

	it("does not render description or trend when omitted", () => {
		render(<StatCard title="Total" value={0} icon={<Wallet />} />);

		// description and trend text should not be present
		expect(screen.queryByText(/from last/i)).not.toBeInTheDocument();
		// Only title and value are rendered — no extra descriptive text
		expect(screen.getByText("Total")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
	});

	it("renders a string value", () => {
		render(<StatCard title="Balance" value="1,250 XLM" icon={<Wallet />} />);
		expect(screen.getByText("1,250 XLM")).toBeInTheDocument();
	});

	it("applies danger variant classes when variant is danger", () => {
		const { container } = render(
			<StatCard
				title="Failed"
				value={3}
				icon={<Wallet />}
				variant="danger"
			/>,
		);

		const card = container.firstChild as HTMLElement;
		expect(card.className).toMatch(/red/);
	});

	it("applies success variant classes when variant is success", () => {
		const { container } = render(
			<StatCard
				title="Delivered"
				value={5}
				icon={<Wallet />}
				variant="success"
			/>,
		);

		const card = container.firstChild as HTMLElement;
		expect(card.className).toMatch(/green/);
	});

	it("renders the icon", () => {
		render(
			<StatCard
				title="Wallets"
				value={10}
				icon={<Wallet data-testid="wallet-icon" />}
			/>,
		);

		expect(screen.getByTestId("wallet-icon")).toBeInTheDocument();
	});
});
