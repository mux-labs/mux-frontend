"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MaskedBalanceProps {
	balance: string | undefined;
	isLive?: boolean;
}

const MASK = "••••••";

export function MaskedBalance({ balance, isLive }: MaskedBalanceProps) {
	const [revealed, setRevealed] = useState(false);

	return (
		<div className="flex items-center gap-3">
			<span className="font-mono text-3xl font-bold text-zinc-900 dark:text-zinc-50">
				{revealed ? (balance ?? "—") : MASK}
			</span>
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={() => setRevealed((v) => !v)}
				title={revealed ? "Hide balance" : "Reveal balance"}
			>
				{revealed ? (
					<EyeOff className="h-4 w-4" />
				) : (
					<Eye className="h-4 w-4" />
				)}
			</Button>
			{isLive && (
				<span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
					<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
					Live
				</span>
			)}
		</div>
	);
}
