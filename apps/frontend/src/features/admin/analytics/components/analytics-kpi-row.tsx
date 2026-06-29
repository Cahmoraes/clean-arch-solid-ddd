"use client"

import { useCheckInMetrics } from "../api/use-check-in-metrics"
import { useGrowthMetrics } from "../api/use-growth-metrics"
import { useRetentionMetrics } from "../api/use-retention-metrics"
import type { PeriodKey } from "../hooks/use-analytics-period"
import { KpiCardWithSparkline } from "./kpi-card-with-sparkline"

interface AnalyticsKpiRowProps {
	period: PeriodKey
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: component handles loading, error and data states for 3 independent KPI cards
export function AnalyticsKpiRow({ period }: AnalyticsKpiRowProps) {
	const checkInQuery = useCheckInMetrics(period)
	const retentionQuery = useRetentionMetrics(period)
	const growthQuery = useGrowthMetrics(period)

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<KpiCardWithSparkline
				value={checkInQuery.data?.totalCheckIns.toLocaleString("pt-BR") ?? "—"}
				label="Check-ins no período"
				sparklineData={checkInQuery.data?.dailySeries.map((d) => d.count) ?? []}
				isLoading={checkInQuery.isPending}
				isError={checkInQuery.isError}
			/>
			<KpiCardWithSparkline
				value={
					retentionQuery.data
						? `${(100 - retentionQuery.data.churnRate).toFixed(1)}%`
						: "—"
				}
				label="Taxa de retenção"
				sparklineData={
					growthQuery.data?.activeMembersTrend.map((d) => d.count) ?? []
				}
				highlight
				isLoading={retentionQuery.isPending || growthQuery.isPending}
				isError={retentionQuery.isError || growthQuery.isError}
			/>
			<KpiCardWithSparkline
				value={growthQuery.data?.newMembersCount.toLocaleString("pt-BR") ?? "—"}
				label="Novos membros"
				sparklineData={
					growthQuery.data?.newMembersPerPeriod.map((d) => d.count) ?? []
				}
				isLoading={growthQuery.isPending}
				isError={growthQuery.isError}
			/>
		</div>
	)
}
