"use client";

import { useState, useCallback, type FormEvent } from "react";
import {
	validateTransactionForm,
	type FieldError,
} from "@/lib/transactionValidation";

export interface TransactionFormData {
	amount: string;
	address: string;
	memo: string;
}

export type OnSubmitTransaction = (data: TransactionFormData) => void;

export interface TransactionFormProps {
	onSubmit: OnSubmitTransaction;
	isSubmitting?: boolean;
	className?: string;
}

export type TransactionFormField = "amount" | "address" | "memo";
export function TransactionForm({
	onSubmit,
	isSubmitting = false,
	className = "",
}: TransactionFormProps) {
	const [amount, setAmount] = useState("");
	const [address, setAddress] = useState("");
	const [memo, setMemo] = useState("");
	const [errors, setErrors] = useState<FieldError[]>([]);
	const [touched, setTouched] = useState<Set<TransactionFormField>>(new Set());

	const getFieldError = useCallback(
		(field: TransactionFormField): string | undefined => {
			return errors.find((e) => e.field === field)?.message;
		},
		[errors],
	);

	const handleBlur = useCallback(
		(field: TransactionFormField) => {
			setTouched((prev) => new Set(prev).add(field));
			const formData = { amount, address, memo };
			const validation = validateTransactionForm(formData);
			setErrors((prev) => {
				const otherErrors = prev.filter((e) => e.field !== field);
				const fieldError = validation.errors.find((e) => e.field === field);
				return fieldError ? [...otherErrors, fieldError] : otherErrors;
			});
		},
		[amount, address, memo],
	);

	const handleSubmit = useCallback(
		(e: FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			setTouched(new Set(["amount", "address", "memo"]));
			const validation = validateTransactionForm({ amount, address, memo });
			if (!validation.isValid) {
				setErrors(validation.errors);
				return;
			}
			setErrors([]);
			onSubmit({ amount, address, memo });
		},
		[amount, address, memo, onSubmit],
	);

	const amountError = getFieldError("amount");
	const addressError = getFieldError("address");
	const memoError = getFieldError("memo");

	return (
		<form
			onSubmit={handleSubmit}
			className={`space-y-6 ${className}`}
			noValidate
			aria-label="Transaction form"
		>
			<div>
				<label
					htmlFor="transaction-amount"
					className="block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					Amount
				</label>
				<div className="mt-1">
					<input
						id="transaction-amount"
						type="text"
						inputMode="decimal"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						onBlur={() => handleBlur("amount")}
						disabled={isSubmitting}
						aria-invalid={touched.has("amount") && !!amountError}
						aria-describedby={
							amountError && touched.has("amount")
								? "transaction-amount-error"
								: undefined
						}
						className={[
							"block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors",
							"focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
							touched.has("amount") && amountError
								? "border-red-500 focus:border-red-500 focus:ring-red-500"
								: "border-gray-300 dark:border-gray-600",
							"bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
						].join(" ")}
						placeholder="0.00"
					/>
				</div>
				{touched.has("amount") && amountError && (
					<p
						id="transaction-amount-error"
						role="alert"
						className="mt-1 text-sm text-red-600 dark:text-red-400"
					>
						{amountError}
					</p>
				)}
			</div>
			<div>
				<label
					htmlFor="transaction-address"
					className="block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					Recipient Address
				</label>
				<div className="mt-1">
					<input
						id="transaction-address"
						type="text"
						value={address}
						onChange={(e) => setAddress(e.target.value)}
						onBlur={() => handleBlur("address")}
						disabled={isSubmitting}
						aria-invalid={touched.has("address") && !!addressError}
						aria-describedby={
							addressError && touched.has("address")
								? "transaction-address-error"
								: undefined
						}
						className={[
							"block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors",
							"focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
							touched.has("address") && addressError
								? "border-red-500 focus:border-red-500 focus:ring-red-500"
								: "border-gray-300 dark:border-gray-600",
							"bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
						].join(" ")}
						placeholder="0x... or destination address"
					/>
				</div>
				{touched.has("address") && addressError && (
					<p
						id="transaction-address-error"
						role="alert"
						className="mt-1 text-sm text-red-600 dark:text-red-400"
					>
						{addressError}
					</p>
				)}
			</div>
			<div>
				<label
					htmlFor="transaction-memo"
					className="block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					Memo (optional)
				</label>
				<div className="mt-1">
					<textarea
						id="transaction-memo"
						rows={3}
						value={memo}
						onChange={(e) => setMemo(e.target.value)}
						onBlur={() => handleBlur("memo")}
						disabled={isSubmitting}
						aria-invalid={touched.has("memo") && !!memoError}
						aria-describedby={
							memoError && touched.has("memo")
								? "transaction-memo-error"
								: undefined
						}
						className={[
							"block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors",
							"focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
							touched.has("memo") && memoError
								? "border-red-500 focus:border-red-500 focus:ring-red-500"
								: "border-gray-300 dark:border-gray-600",
							"bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
						].join(" ")}
						placeholder="Optional memo or note"
					/>
				</div>
				{touched.has("memo") && memoError && (
					<p
						id="transaction-memo-error"
						role="alert"
						className="mt-1 text-sm text-red-600 dark:text-red-400"
					>
						{memoError}
					</p>
				)}
			</div>
			{errors.length > 0 && (
				<div
					role="alert"
					className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950"
				>
					<p className="text-sm font-medium text-red-800 dark:text-red-200">
						Please fix the following errors:
					</p>
					<ul className="mt-1 list-inside list-disc text-sm text-red-700 dark:text-red-300">
						{errors.map((err) => (
							<li key={err.field}>{err.message}</li>
						))}
					</ul>
				</div>
			)}
			<button
				type="submit"
				disabled={isSubmitting}
				className={[
					"w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all",
					"focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
					isSubmitting
						? "cursor-not-allowed bg-blue-400"
						: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
				].join(" ")}
			>
				{isSubmitting ? (
					<span className="flex items-center justify-center gap-2">
						<svg
							className="h-4 w-4 animate-spin"
							viewBox="0 0 24 24"
							fill="none"
							aria-hidden="true"
						>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							/>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
							/>
						</svg>
						Submitting...
					</span>
				) : (
					"Send Transaction"
				)}
			</button>
		</form>
	);
}
