import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NetworkBadgeProps {
	network: string | null | undefined;
	className?: string;
}

const networkStyles: Record<string, string> = {
	testnet:
		"bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
	mainnet:
		"bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
};

const networkLabels: Record<string, string> = {
	testnet: "Testnet",
	mainnet: "Mainnet",
};

const unknownStyle =
	"bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";

export function NetworkBadge({ network, className }: NetworkBadgeProps) {
	const key = typeof network === "string" ? network.toLowerCase() : "";
	const style = networkStyles[key] ?? unknownStyle;
	const label = networkLabels[key] ?? "Unknown";

	return (
		<Badge variant="outline" className={cn(style, className)}>
			{label}
		</Badge>
	);
}
