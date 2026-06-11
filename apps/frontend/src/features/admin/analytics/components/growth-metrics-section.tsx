"use client"

import { ChevronDown } from "lucide-react"
import { useState } from "react"
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
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
import { useGrowthMetrics } from "../api/use-growth-metrics"
import type { PeriodKey } from "../hooks/use-analytics-period"

const areaChartConfig: ChartConfig = {
	count: { label: "Membros ativos", color: "hsl(var(--chart-1))" },
}

const barChartConfig: ChartConfig = {
	count: { label: "Novos membros", color: "hsl(var(--chart-3))" },
}

interface GrowthMetricsSectionProps {
	period: PeriodKey
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: component handles loading, error, empty and data states for multiple charts
export function GrowthMetricsSection({ period }: GrowthMetricsSectionProps) {
	const [isOpen, setIsOpen] = useState(false) // fechado por padrão (FR-016)
	const { data, isPending, isError } = useGrowthMetrics(period)

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card p-4 text-left font-semibold hover:bg-accent/50">
				<span>Crescimento</span>
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
						Erro ao carregar dados de crescimento.
					</p>
				)}

				{data && data.activeMembersTrend.length === 0 && (
					<p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
						Nenhum dado de crescimento neste período.
					</p>
				)}

				{data && data.activeMembersTrend.length > 0 && (
					<div className="rounded-lg border bg-card p-4">
						<h3 className="mb-4 text-sm font-medium text-muted-foreground">
							Tendência de membros ativos
						</h3>
						<ChartContainer config={areaChartConfig} className="h-[200px]">
							<AreaChart data={data.activeMembersTrend}>
								<defs>
									<linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
										<stop
											offset="5%"
											stopColor="var(--color-count)"
											stopOpacity={0.3}
										/>
										<stop
											offset="95%"
											stopColor="var(--color-count)"
											stopOpacity={0}
										/>
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
								<XAxis
									dataKey="date"
									tick={{ fontSize: 11 }}
									tickFormatter={(v: string) => v.slice(5)}
								/>
								<YAxis tick={{ fontSize: 11 }} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Area
									type="monotone"
									dataKey="count"
									stroke="var(--color-count)"
									fill="url(#colorCount)"
									strokeWidth={2}
								/>
							</AreaChart>
						</ChartContainer>
					</div>
				)}

				{data && data.newMembersPerPeriod.length > 0 && (
					<div className="rounded-lg border bg-card p-4">
						<h3 className="mb-4 text-sm font-medium text-muted-foreground">
							Novos membros por período
						</h3>
						<ChartContainer config={barChartConfig} className="h-[200px]">
							<BarChart data={data.newMembersPerPeriod}>
								<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
								<XAxis
									dataKey="date"
									tick={{ fontSize: 11 }}
									tickFormatter={(v: string) => v.slice(5)}
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
