"use client"

import { useId } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"

interface KpiCardWithSparklineProps {
	value: string | number
	label: string
	sparklineData: number[]
	highlight?: boolean
	isLoading?: boolean
	isError?: boolean
}

export function buildSparklinePath(data: number[]): string {
	if (data.length < 2) return "M0,15 L80,15"
	const min = Math.min(...data)
	const max = Math.max(...data)
	if (max === min) return "M0,15 L80,15"
	const normalize = (v: number) => 28 - ((v - min) / (max - min)) * 26
	const xStep = 80 / (data.length - 1)
	return data
		.map(
			(v, i) =>
				`${i === 0 ? "M" : "L"}${(i * xStep).toFixed(1)},${normalize(v).toFixed(1)}`,
		)
		.join(" ")
}

export function KpiCardWithSparkline({
	value,
	label,
	sparklineData,
	highlight = false,
	isLoading = false,
	isError = false,
}: KpiCardWithSparklineProps) {
	const gradientId = useId()

	if (isLoading) {
		return <Skeleton className="h-28 w-full rounded-[14px]" />
	}

	if (isError) {
		return (
			<div className="flex h-28 items-center justify-center rounded-[14px] border border-destructive/30 bg-destructive/5 p-4">
				<p className="text-sm text-destructive">Erro ao carregar dados</p>
			</div>
		)
	}

	const path = buildSparklinePath(sparklineData)
	const showSvg = sparklineData.length >= 2

	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-[14px] border px-5 pb-3.5 pt-[18px]",
				highlight
					? "border-primary/35 bg-primary/[0.04]"
					: "border-border bg-card",
			)}
		>
			<p className="text-2xl font-bold tracking-tight">{value}</p>
			<p className="mt-1 text-sm text-muted-foreground">{label}</p>
			{showSvg && (
				<svg
					className="absolute bottom-0 right-0 opacity-35"
					style={{ width: "45%", height: "50%" }}
					viewBox="0 0 80 30"
					preserveAspectRatio="none"
					aria-hidden="true"
				>
					<defs>
						<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
							<stop
								offset="0%"
								stopColor="var(--color-primary)"
								stopOpacity="0.4"
							/>
							<stop
								offset="100%"
								stopColor="var(--color-primary)"
								stopOpacity="0"
							/>
						</linearGradient>
					</defs>
					<path d={`${path} L80,30 L0,30 Z`} fill={`url(#${gradientId})`} />
					<path
						d={path}
						fill="none"
						stroke="var(--color-primary)"
						strokeWidth="1.5"
					/>
				</svg>
			)}
		</div>
	)
}
