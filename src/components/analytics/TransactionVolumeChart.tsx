"use client";

import React, { useMemo, useRef, useState } from "react";
import type { TransactionVolumePoint } from "@/mock-data/transaction-volume";

interface Props {
	data: TransactionVolumePoint[];
	metric?: "count" | "volume";
}

const PADDING = { top: 20, right: 16, bottom: 40, left: 56 };
const HEIGHT = 240;

export function TransactionVolumeChart({ data, metric = "count" }: Props) {
	const svgRef = useRef<SVGSVGElement>(null);
	const [tooltip, setTooltip] = useState<{
		x: number;
		y: number;
		point: TransactionVolumePoint;
	} | null>(null);

	const values = useMemo(() => data.map((d) => d[metric]), [data, metric]);
	const maxVal = useMemo(() => Math.max(...values, 1), [values]);

	// Responsive width via viewBox — we use a fixed coordinate space
	const W = 800;
	const innerW = W - PADDING.left - PADDING.right;
	const innerH = HEIGHT - PADDING.top - PADDING.bottom;

	const points = useMemo(() => {
		return data.map((d, i) => {
			const x = PADDING.left + (i / Math.max(data.length - 1, 1)) * innerW;
			const y = PADDING.top + innerH - (d[metric] / maxVal) * innerH;
			return { x, y, d };
		});
	}, [data, metric, maxVal, innerW, innerH]);

	const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

	// Area path
	const area =
		points.length > 0
			? `M${points[0].x},${PADDING.top + innerH} ` +
				points.map((p) => `L${p.x},${p.y}`).join(" ") +
				` L${points[points.length - 1].x},${PADDING.top + innerH} Z`
			: "";

	// Y-axis ticks
	const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
		y: PADDING.top + innerH - t * innerH,
		label:
			metric === "volume"
				? `${Math.round(maxVal * t).toLocaleString()}`
				: `${Math.round(maxVal * t)}`,
	}));

	// X-axis ticks — show ~6 evenly spaced labels
	const xTickCount = Math.min(6, data.length);
	const xTicks = Array.from({ length: xTickCount }, (_, i) => {
		const idx = Math.round((i / (xTickCount - 1)) * (data.length - 1));
		return { x: points[idx]?.x ?? 0, label: data[idx]?.date.slice(5) ?? "" };
	});

	function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
		if (!svgRef.current || points.length === 0) return;
		const rect = svgRef.current.getBoundingClientRect();
		const scaleX = W / rect.width;
		const mx = (e.clientX - rect.left) * scaleX;
		// Find nearest point
		let nearest = points[0];
		let minDist = Math.abs(points[0].x - mx);
		for (const p of points) {
			const dist = Math.abs(p.x - mx);
			if (dist < minDist) {
				minDist = dist;
				nearest = p;
			}
		}
		setTooltip({ x: nearest.x, y: nearest.y, point: nearest.d });
	}

	// Resolve CSS variable values for SVG (SVG doesn't inherit Tailwind dark: variants)
	const isDark =
		typeof window !== "undefined" &&
		document.documentElement.classList.contains("dark");
	const gridColor = isDark ? "oklch(1 0 0 / 10%)" : "#e4e4e7";
	const axisColor = isDark ? "#a1a1aa" : "#71717a";

	return (
		<div className="relative w-full">
			<svg
				ref={svgRef}
				viewBox={`0 0 ${W} ${HEIGHT}`}
				className="w-full"
				style={{ height: HEIGHT }}
				onMouseMove={handleMouseMove}
				onMouseLeave={() => setTooltip(null)}
				aria-label="Transaction volume chart"
				role="img"
			>
				<defs>
					<linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
						<stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
					</linearGradient>
				</defs>

				{/* Grid lines */}
				{yTicks.map((t) => (
					<line
						key={t.y}
						x1={PADDING.left}
						x2={W - PADDING.right}
						y1={t.y}
						y2={t.y}
						stroke={gridColor}
						strokeWidth="1"
					/>
				))}

				{/* Area fill */}
				{area && <path d={area} fill="url(#areaGrad)" />}

				{/* Line */}
				<polyline
					points={polyline}
					fill="none"
					stroke="#3b82f6"
					strokeWidth="2"
					strokeLinejoin="round"
					strokeLinecap="round"
				/>

				{/* Y-axis labels */}
				{yTicks.map((t) => (
					<text
						key={t.y}
						x={PADDING.left - 8}
						y={t.y + 4}
						textAnchor="end"
						fontSize="11"
						fill={axisColor}
					>
						{t.label}
					</text>
				))}

				{/* X-axis labels */}
				{xTicks.map((t) => (
					<text
						key={t.x}
						x={t.x}
						y={HEIGHT - 8}
						textAnchor="middle"
						fontSize="11"
						fill={axisColor}
					>
						{t.label}
					</text>
				))}

				{/* Tooltip crosshair */}
				{tooltip && (
					<>
						<line
							x1={tooltip.x}
							x2={tooltip.x}
							y1={PADDING.top}
							y2={PADDING.top + innerH}
							stroke="#3b82f6"
							strokeWidth="1"
							strokeDasharray="4 2"
						/>
						<circle
							cx={tooltip.x}
							cy={tooltip.y}
							r="4"
							fill="#3b82f6"
							stroke="white"
							strokeWidth="2"
						/>
					</>
				)}
			</svg>

			{/* Tooltip box */}
			{tooltip && (
				<div
					className="pointer-events-none absolute z-10 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-md text-xs dark:border-zinc-700 dark:bg-zinc-900"
					style={{
						left: `${(tooltip.x / W) * 100}%`,
						top: `${(tooltip.y / HEIGHT) * 100}%`,
						transform: "translate(-50%, -120%)",
					}}
				>
					<p className="font-semibold text-zinc-900 dark:text-zinc-50">
						{tooltip.point.date}
					</p>
					<p className="text-zinc-500">
						{metric === "count"
							? `${tooltip.point.count} txns`
							: `${tooltip.point.volume.toLocaleString()} XLM`}
					</p>
				</div>
			)}
		</div>
	);
}
