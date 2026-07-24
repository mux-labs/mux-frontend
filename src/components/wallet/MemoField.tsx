"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

const MAX_MEMO_LENGTH = 28;

interface MemoFieldProps {
	value?: string;
	onChange?: (value: string) => void;
	maxLength?: number;
}

/**
 * Memo input with a character counter, matching Stellar's 28-byte memo text limit.
 */
export function MemoField({
	value,
	onChange,
	maxLength = MAX_MEMO_LENGTH,
}: MemoFieldProps) {
	const [internalValue, setInternalValue] = useState("");
	const memo = value ?? internalValue;
	const id = useId();
	const remaining = maxLength - memo.length;

	const handleChange = (next: string) => {
		if (next.length > maxLength) return;
		setInternalValue(next);
		onChange?.(next);
	};

	return (
		<div className="space-y-1">
			<label htmlFor={id} className="text-sm font-medium">
				Memo (optional)
			</label>
			<input
				id={id}
				value={memo}
				maxLength={maxLength}
				onChange={(e) => handleChange(e.target.value)}
				className="w-full rounded-md border px-3 py-2 text-sm"
				placeholder="Add a memo"
			/>
			<p
				className={cn(
					"text-xs text-right",
					remaining <= 5 ? "text-red-500" : "text-muted-foreground",
				)}
				data-testid="memo-counter"
			>
				{memo.length}/{maxLength}
			</p>
		</div>
	);
}
