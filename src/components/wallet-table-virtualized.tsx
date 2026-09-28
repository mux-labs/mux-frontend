"use client";

import { useMemo, useState, type ReactNode, type UIEvent } from "react";

interface VirtualizedWalletTableProps<T> {
	rows: T[];
	rowHeight: number;
	height: number;
	overscan?: number;
	getRowKey: (row: T, index: number) => string;
	renderRow: (row: T, index: number) => ReactNode;
}

export function getVisibleRange(
	scrollTop: number,
	height: number,
	rowHeight: number,
	rowCount: number,
	overscan = 5,
) {
	if (rowHeight <= 0 || rowCount <= 0) return { start: 0, end: 0 };
	const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
	const end = Math.min(
		rowCount,
		Math.ceil((scrollTop + height) / rowHeight) + overscan,
	);
	return { start, end };
}

export function VirtualizedWalletTable<T>({
	rows,
	rowHeight,
	height,
	overscan = 5,
	getRowKey,
	renderRow,
}: VirtualizedWalletTableProps<T>) {
	const [scrollTop, setScrollTop] = useState(0);
	const { start, end } = useMemo(
		() => getVisibleRange(scrollTop, height, rowHeight, rows.length, overscan),
		[scrollTop, height, rowHeight, rows.length, overscan],
	);

	return (
		<div
			role="table"
			aria-rowcount={rows.length}
			style={{ height, overflowY: "auto" }}
			onScroll={(e: UIEvent<HTMLDivElement>) =>
				setScrollTop(e.currentTarget.scrollTop)
			}
		>
			<div
				role="rowgroup"
				style={{ height: rows.length * rowHeight, position: "relative" }}
			>
				{rows.slice(start, end).map((row, i) => {
					const index = start + i;
					return (
						<div
							key={getRowKey(row, index)}
							role="row"
							aria-rowindex={index + 1}
							style={{
								position: "absolute",
								top: index * rowHeight,
								height: rowHeight,
								width: "100%",
							}}
						>
							{renderRow(row, index)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
