"use client"

import { Activity, TrendingUp, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/ui/stat-card"
import { useCheckInMetrics } from "../api/use-check-in-metrics"
import { useGrowthMetrics } from "../api/use-growth-metrics"
import { useRetentionMetrics } from "../api/use-retention-metrics"
import type { PeriodKey } from "../hooks/use-analytics-period"

interface AnalyticsKpiRowProps {
	period: PeriodKey
}

function KpiSkeleton() {
	return <Skeleton className="h-28 w-full rounded-lg" />
}

function KpiError({ message }: { message: string }) {
	return (
		<div className="flex h-28 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-4">
			<p className="text-sm text-destructive">{message}</p>
		</div>
	)
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: component handles multiple independent loading/error states per KPI card
export function AnalyticsKpiRow({ period }: AnalyticsKpiRowProps) {
	const checkInQuery = useCheckInMetrics(period)
	const retentionQuery = useRetentionMetrics(period)
	const growthQuery = useGrowthMetrics(period)

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
			{checkInQuery.isPending ? (
				<KpiSkeleton />
			) : checkInQuery.isError ? (
				<KpiError message="Erro ao carregar check-ins" />
			) : (
				<StatCard
					icon={Activity}
					value={checkInQuery.data.totalCheckIns.toLocaleString("pt-BR")}
					label="Check-ins no período"
				/>
			)}

			{retentionQuery.isPending ? (
				<KpiSkeleton />
			) : retentionQuery.isError ? (
				<KpiError message="Erro ao carregar retenção" />
			) : (
				<StatCard
					icon={Users}
					value={`${(100 - retentionQuery.data.churnRate).toFixed(1)}%`}
					label="Taxa de retenção"
				/>
			)}

			{growthQuery.isPending ? (
				<KpiSkeleton />
			) : growthQuery.isError ? (
				<KpiError message="Erro ao carregar crescimento" />
			) : (
				<StatCard
					icon={TrendingUp}
					value={growthQuery.data.newMembersCount.toLocaleString("pt-BR")}
					label="Novos membros"
				/>
			)}
		</div>
	)
}
