"use client"

import { Suspense } from "react"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/ui/page-header"
import { AnalyticsKpiRow } from "@/features/admin/analytics/components/analytics-kpi-row"
import { CheckInMetricsSection } from "@/features/admin/analytics/components/check-in-metrics-section"
import { GrowthMetricsSection } from "@/features/admin/analytics/components/growth-metrics-section"
import { PeriodSelector } from "@/features/admin/analytics/components/period-selector"
import { RetentionMetricsSection } from "@/features/admin/analytics/components/retention-metrics-section"
import { useAnalyticsPeriod } from "@/features/admin/analytics/hooks/use-analytics-period"

function AnalyticsContent() {
	const { period, setPeriod } = useAnalyticsPeriod()

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div />
				<PeriodSelector value={period} onValueChange={setPeriod} />
			</div>

			<AnalyticsKpiRow period={period} />

			<CheckInMetricsSection period={period} />
			<RetentionMetricsSection period={period} />
			<GrowthMetricsSection period={period} />
		</div>
	)
}

export default function AnalyticsPage() {
	return (
		<PageContainer>
			<PageHeader title="Analytics" />
			<Suspense>
				<AnalyticsContent />
			</Suspense>
		</PageContainer>
	)
}
