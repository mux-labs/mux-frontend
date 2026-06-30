"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/utils/copyToClipboard";
import { RecoveryDocsLink } from "./RecoveryDocsLink";

/**
 * A single item in the FAQ accordion.
 */
export interface FAQItem {
	/** Unique identifier used as the ARIA control/region id pair. */
	id: string;
	/** Short question text shown in the collapsed trigger button. */
	question: string;
	/** Full answer text revealed when the item is expanded. */
	answer: string;
}

export const FAQ_ITEMS: FAQItem[] = [
	{
		id: "what-is-recovery",
		question: "What is invisible wallet recovery?",
		answer:
			"Invisible wallet recovery is an automatic system that keeps your wallet accessible even if you lose your device or account credentials. It works silently in the background — no seed phrases or manual steps required.",
	},
	{
		id: "how-long",
		question: "How long does recovery take?",
		answer:
			"Most recovery operations complete within a few minutes. Complex scenarios involving network issues or multiple devices may take up to 24 hours. Your funds remain secure throughout the entire process.",
	},
	{
		id: "is-it-safe",
		question: "Is my recovery data safe?",
		answer:
			"Yes. All recovery data is encrypted at rest and in transit. Your private keys never leave secure storage and are never exposed during the recovery process. Recovery uses encrypted methods that do not require key exposure.",
	},
	{
		id: "when-triggered",
		question: "When is recovery automatically triggered?",
		answer:
			"Recovery is triggered automatically when the system detects device loss, authentication failures, or prolonged network disconnection. You can also initiate it manually from this page if you believe your wallet needs immediate attention.",
	},
	{
		id: "what-not-covered",
		question: "What does recovery NOT cover?",
		answer:
			"Recovery cannot restore funds sent to incorrect addresses or lost due to user error. Always verify transaction details before confirming. Recovery is designed to restore wallet access, not reverse completed transactions.",
	},
	{
		id: "contact-support",
		question: "What if recovery doesn't complete after 24 hours?",
		answer:
			"If your wallet is still inaccessible after 24 hours, or if you notice any suspicious activity, contact our support team immediately. Do not attempt multiple manual recovery initiations as this may delay the process.",
	},
];

/**
 * Props for the {@link RecoveryFAQ} accordion component.
 */
interface RecoveryFAQProps {
	/**
	 * FAQ items to render in the accordion.
	 *
	 * Defaults to the built-in {@link FAQ_ITEMS} array. Pass a custom array
	 * to override the content for testing or localised deployments.
	 * An empty array renders a "No FAQ items available" fallback message.
	 *
	 * @default FAQ_ITEMS
	 */
	items?: FAQItem[];

	/**
	 * Additional Tailwind classes merged onto the root `<section>` element.
	 */
	className?: string;
}

interface FAQItemProps {
	item: FAQItem;
	isOpen: boolean;
	onToggle: () => void;
}

function FAQRow({ item, isOpen, onToggle }: FAQItemProps) {
	const [copiedAnswer, setCopiedAnswer] = useState(false);

	const handleCopyAnswer = useCallback(async () => {
		try {
			await copyToClipboard(item.answer);
			setCopiedAnswer(true);
			setTimeout(() => setCopiedAnswer(false), 2000);
		} catch {
			// Clipboard write failed — silently ignore
		}
	}, [item.answer]);

	return (
		<div className="border-b border-zinc-200 dark:border-zinc-800 last:border-0">
			<button
				type="button"
				aria-expanded={isOpen}
				aria-controls={`faq-answer-${item.id}`}
				id={`faq-question-${item.id}`}
				onClick={onToggle}
				className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-zinc-900 dark:text-zinc-50 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-sm"
			>
				<span>{item.question}</span>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth={2}
					stroke="currentColor"
					aria-hidden="true"
					className={cn(
						"w-4 h-4 shrink-0 text-zinc-400 transition-transform duration-200",
						isOpen && "rotate-180",
					)}
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>

			<div
				id={`faq-answer-${item.id}`}
				role="region"
				aria-labelledby={`faq-question-${item.id}`}
				hidden={!isOpen}
				className="pb-4"
			>
				<p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
					{item.answer}
				</p>
				<button
					type="button"
					onClick={handleCopyAnswer}
					aria-label={
						copiedAnswer
							? "Answer copied to clipboard"
							: "Copy answer to clipboard"
					}
					className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-sm px-2 py-1"
				>
					{copiedAnswer ? (
						<>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth={2}
								stroke="currentColor"
								className="w-3.5 h-3.5"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M4.5 12.75l6 6 9-13.5"
								/>
							</svg>
							Copied
						</>
					) : (
						<>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth={2}
								stroke="currentColor"
								className="w-3.5 h-3.5"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
								/>
							</svg>
							Copy
						</>
					)}
				</button>
			</div>
		</div>
	);
}

/**
 * Accordion FAQ section for the recovery page.
 * Each item is independently expandable/collapsible.
 * Handles an empty items array gracefully with a fallback message.
 */
export function RecoveryFAQ({
	items = FAQ_ITEMS,
	className,
}: RecoveryFAQProps) {
	const [openId, setOpenId] = useState<string | null>(null);

	const toggle = (id: string) => {
		setOpenId((prev) => (prev === id ? null : id));
	};

	return (
		<section
			aria-labelledby="recovery-faq-heading"
			className={cn(
				"rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950",
				className,
			)}
		>
			<h2
				id="recovery-faq-heading"
				className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4"
			>
				Frequently Asked Questions
			</h2>

			{items.length === 0 ? (
				<p className="text-sm text-zinc-500 dark:text-zinc-400">
					No FAQ items available.
				</p>
			) : (
				<div role="list" className="mb-4">
					{items.map((item) => (
						<div key={item.id} role="listitem">
							<FAQRow
								item={item}
								isOpen={openId === item.id}
								onToggle={() => toggle(item.id)}
							/>
						</div>
					))}
				</div>
			)}

			<div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<p className="text-sm text-zinc-600 dark:text-zinc-400">
					Looking for more technical details? Check out our complete recovery
					guide.
				</p>
				<RecoveryDocsLink />
			</div>
		</section>
	);
}
