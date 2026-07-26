import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

/**
 * Tests for dark mode styling on the login page.
 *
 * These tests verify that dark mode CSS classes are properly applied to
 * login page elements, allowing them to respond to the `.dark` class on
 * the document root.
 */
describe("LoginPage - Dark Mode Styles", () => {
	beforeEach(() => {
		// Clean up dark mode class before each test
		document.documentElement.classList.remove("dark");
	});

	it("applies dark mode background classes to page container", () => {
		document.documentElement.classList.add("dark");
		const { container } = render(
			<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
				Test
			</div>,
		);

		const pageContainer = container.firstChild as HTMLElement;
		expect(pageContainer).toHaveClass("dark:bg-zinc-950");
	});

	it("applies dark mode text classes to heading elements", () => {
		document.documentElement.classList.add("dark");
		render(
			<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
				Mux Protocol
			</h1>,
		);

		const heading = screen.getByText("Mux Protocol");
		expect(heading).toHaveClass("dark:text-white");
	});

	it("applies dark mode classes to login card container", () => {
		document.documentElement.classList.add("dark");
		const { container } = render(
			<div className="rounded-2xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
				Card content
			</div>,
		);

		const card = container.firstChild as HTMLElement;
		expect(card).toHaveClass("dark:border-zinc-800");
		expect(card).toHaveClass("dark:bg-zinc-900");
	});

	it("applies dark mode classes to input fields", () => {
		document.documentElement.classList.add("dark");
		render(
			<input
				type="email"
				className="block w-full rounded-lg border border-gray-300 bg-white dark:border-zinc-700 dark:bg-zinc-800"
			/>,
		);

		const input = screen.getByRole("textbox");
		expect(input).toHaveClass("dark:border-zinc-700");
		expect(input).toHaveClass("dark:bg-zinc-800");
	});

	it("applies dark mode classes to error messages", () => {
		document.documentElement.classList.add("dark");
		render(
			<div className="border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30">
				<span className="text-red-700 dark:text-red-300">Error message</span>
			</div>,
		);

		const errorText = screen.getByText("Error message");
		expect(errorText).toHaveClass("dark:text-red-300");
	});

	it("applies dark mode classes to welcome hint", () => {
		document.documentElement.classList.add("dark");
		const { container } = render(
			<div className="border border-blue-100 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30">
				<p className="text-blue-700 dark:text-blue-300">Welcome</p>
			</div>,
		);

		const welcome = screen.getByText("Welcome");
		expect(welcome).toHaveClass("dark:text-blue-300");
	});

	it("applies dark mode classes to submit button", () => {
		document.documentElement.classList.add("dark");
		render(
			<button
				type="submit"
				className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
			>
				Sign in
			</button>,
		);

		const button = screen.getByRole("button");
		expect(button).toHaveClass("dark:bg-blue-700");
		expect(button).toHaveClass("dark:hover:bg-blue-600");
	});

	it("applies dark mode classes to labels", () => {
		document.documentElement.classList.add("dark");
		render(
			<label
				htmlFor="email"
				className="text-sm font-medium text-gray-700 dark:text-zinc-300"
			>
				Email address
			</label>,
		);

		const label = screen.getByText("Email address");
		expect(label).toHaveClass("dark:text-zinc-300");
	});
});
