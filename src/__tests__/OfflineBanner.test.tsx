import "@testing-library/jest-dom";
import { render, screen, act } from "@testing-library/react";
import { OfflineBanner } from "@/components/ui/OfflineBanner";

/**
 * Helpers to simulate navigator.onLine and fire the corresponding events.
 */
function goOffline() {
	Object.defineProperty(navigator, "onLine", {
		value: false,
		writable: true,
		configurable: true,
	});
	act(() => {
		window.dispatchEvent(new Event("offline"));
	});
}

function goOnline() {
	Object.defineProperty(navigator, "onLine", {
		value: true,
		writable: true,
		configurable: true,
	});
	act(() => {
		window.dispatchEvent(new Event("online"));
	});
}

beforeEach(() => {
	// Start each test in online state
	Object.defineProperty(navigator, "onLine", {
		value: true,
		writable: true,
		configurable: true,
	});
});

describe("OfflineBanner", () => {
	it("does not render when the browser is online", () => {
		render(<OfflineBanner />);
		expect(screen.queryByTestId("offline-banner")).not.toBeInTheDocument();
	});

	it("renders the banner when the browser goes offline", () => {
		render(<OfflineBanner />);
		goOffline();
		expect(screen.getByTestId("offline-banner")).toBeInTheDocument();
		expect(
			screen.getByText(/you are offline/i),
		).toBeInTheDocument();
	});

	it("hides the banner when the browser comes back online", () => {
		render(<OfflineBanner />);
		goOffline();
		expect(screen.getByTestId("offline-banner")).toBeInTheDocument();
		goOnline();
		expect(screen.queryByTestId("offline-banner")).not.toBeInTheDocument();
	});

	it("has correct ARIA attributes for accessibility", () => {
		render(<OfflineBanner />);
		goOffline();
		const banner = screen.getByTestId("offline-banner");
		expect(banner).toHaveAttribute("role", "alert");
		expect(banner).toHaveAttribute("aria-live", "assertive");
	});
});
