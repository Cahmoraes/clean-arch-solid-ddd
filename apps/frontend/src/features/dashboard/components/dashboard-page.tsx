"use client"

import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDashboardHistory } from "@/features/dashboard/api"
import {
	computeHeatmap,
	computeStatusDistribution,
	computeStreak,
	computeThisMonth,
	computeWeeklyFrequency,
} from "@/features/dashboard/hooks/use-dashboard-metrics"
import { CheckinsTimeline } from "./checkins-timeline"
import { HeatmapCard } from "./heatmap-card"
import { KpiCards } from "./kpi-cards"
import { ProfileHeroCard } from "./profile-hero-card"
import { StatusDonutCard } from "./status-donut-card"
import { WeeklyChart } from "./weekly-chart"

function ErrorBanner({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
			<AlertCircle
				className="h-4 w-4 flex-shrink-0 text-muted-foreground"
				aria-hidden="true"
			/>
			<p className="flex-1 text-sm text-muted-foreground">
				Não foi possível carregar o histórico de check-ins.
			</p>
			<Button variant="outline" size="sm" onClick={onRetry}>
				Tentar novamente
			</Button>
		</div>
	)
}

export function DashboardPage() {
	const {
		data: history = [],
		isLoading: isHistoryLoading,
		isError: isHistoryError,
		refetch,
	} = useDashboardHistory()

	const thisMonth = computeThisMonth(history)
	const streak = computeStreak(history)
	const weeklyFrequency = computeWeeklyFrequency(history)
	const heatmapDays = computeHeatmap(history)
	const statusDistribution = computeStatusDistribution(history)

	const now = new Date()
	const dateLabel = now.toLocaleDateString("pt-BR", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	})

	const formattedDate = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h1 className="text-xl font-semibold">Dashboard</h1>
				<p className="text-sm text-muted-foreground">{formattedDate}</p>
			</div>

			<ProfileHeroCard thisMonth={thisMonth} streak={streak} />

			{isHistoryError && <ErrorBanner onRetry={refetch} />}

			<KpiCards
				thisMonth={thisMonth}
				streak={streak}
				isHistoryLoading={isHistoryLoading}
			/>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<div className="lg:col-span-2">
					<WeeklyChart
						frequency={weeklyFrequency}
						isLoading={isHistoryLoading}
					/>
				</div>
				<StatusDonutCard
					distribution={statusDistribution}
					isLoading={isHistoryLoading}
				/>
			</div>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<HeatmapCard days={heatmapDays} isLoading={isHistoryLoading} />
				<CheckinsTimeline checkIns={history} isLoading={isHistoryLoading} />
			</div>
		</div>
	)
}
