"use client"

import { ChevronDown } from "lucide-react"
import { useState } from "react"
import {
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	XAxis,
	YAxis,
} from "recharts"
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { useCheckInMetrics } from "../api/use-check-in-metrics"
import type { PeriodKey } from "../hooks/use-analytics-period"

const lineChartConfig: ChartConfig = {
	count: { label: "Check-ins", color: "hsl(var(--chart-1))" },
}

const barChartConfig: ChartConfig = {
	count: { label: "Check-ins", color: "hsl(var(--chart-2))" },
}

interface CheckInMetricsSectionProps {
	period: PeriodKey
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: component handles loading, error, empty and data states for multiple charts
export function CheckInMetricsSection({ period }: CheckInMetricsSectionProps) {
	const [isOpen, setIsOpen] = useState(true)
	const { data, isPending, isError } = useCheckInMetrics(period)

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card p-4 text-left font-semibold hover:bg-accent/50">
				<span>Check-ins</span>
				<ChevronDown
					className="h-4 w-4 transition-transform duration-200"
					style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
				/>
			</CollapsibleTrigger>

			<CollapsibleContent className="mt-2 space-y-6">
				{isPending && (
					<div className="space-y-4">
						<Skeleton className="h-[200px] w-full rounded-lg" />
						<Skeleton className="h-[200px] w-full rounded-lg" />
					</div>
				)}

				{isError && (
					<p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
						Erro ao carregar dados de check-ins.
					</p>
				)}

				{data && data.dailySeries.length === 0 && (
					<p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
						Nenhum check-in registrado neste período.
					</p>
				)}

				{data && data.dailySeries.length > 0 && (
					<div className="rounded-lg border bg-card p-4">
						<h3 className="mb-4 text-sm font-medium text-muted-foreground">
							Evolução de check-ins
						</h3>
						<ChartContainer config={lineChartConfig} className="h-[200px]">
							<LineChart data={data.dailySeries}>
								<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
								<XAxis
									dataKey="date"
									tick={{ fontSize: 11 }}
									tickFormatter={(v: string) => v.slice(5)}
								/>
								<YAxis tick={{ fontSize: 11 }} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Line
									type="monotone"
									dataKey="count"
									stroke="var(--color-count)"
									strokeWidth={2}
									dot={false}
								/>
							</LineChart>
						</ChartContainer>
					</div>
				)}

				{data && data.hourlyDistribution.length > 0 && (
					<div className="rounded-lg border bg-card p-4">
						<h3 className="mb-4 text-sm font-medium text-muted-foreground">
							Distribuição por hora
						</h3>
						<ChartContainer config={barChartConfig} className="h-[200px]">
							<BarChart data={data.hourlyDistribution}>
								<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
								<XAxis
									dataKey="hour"
									tick={{ fontSize: 11 }}
									tickFormatter={(v: number) => `${v}h`}
								/>
								<YAxis tick={{ fontSize: 11 }} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar
									dataKey="count"
									fill="var(--color-count)"
									radius={[2, 2, 0, 0]}
								/>
							</BarChart>
						</ChartContainer>
					</div>
				)}
			</CollapsibleContent>
		</Collapsible>
	)
}
