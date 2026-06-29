"use client"

import { Suspense } from "react"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/ui/page-header"
import { useRetentionMetrics } from "@/features/admin/analytics/api/use-retention-metrics"
import { AnalyticsKpiRow } from "@/features/admin/analytics/components/analytics-kpi-row"
import { AtRiskAlertZone } from "@/features/admin/analytics/components/at-risk-alert-zone"
import { PeriodSelector } from "@/features/admin/analytics/components/period-selector"
import { RetentionMiniStats } from "@/features/admin/analytics/components/retention-mini-stats"
import { useAnalyticsPeriod } from "@/features/admin/analytics/hooks/use-analytics-period"

function AnalyticsContent() {
	const { period, setPeriod } = useAnalyticsPeriod()
	const retentionQuery = useRetentionMetrics(period)

	return (
		<div className="space-y-6">
			<div className="flex justify-end">
				<PeriodSelector value={period} onValueChange={setPeriod} />
			</div>
			<AtRiskAlertZone
				members={retentionQuery.data?.atRiskMembers ?? []}
				isLoading={retentionQuery.isPending}
			/>
			<AnalyticsKpiRow period={period} />
			<RetentionMiniStats
				activeCount={retentionQuery.data?.activeCount ?? 0}
				inactiveCount={retentionQuery.data?.inactiveCount ?? 0}
				churnRate={retentionQuery.data?.churnRate ?? 0}
				isLoading={retentionQuery.isPending}
			/>
		</div>
	)
}

export default function AnalyticsPage() {
	return (
		<PageContainer>
			<PageHeader title="Analytics" />
			<Suspense fallback={null}>
				<AnalyticsContent />
			</Suspense>
		</PageContainer>
	)
}
