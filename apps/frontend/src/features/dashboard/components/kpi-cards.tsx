"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useMetrics } from "@/features/profile/api"
import { cn } from "@/lib/cn"

interface KpiCardProps {
	label: string
	value: string | number
	sub?: string
	isLoading?: boolean
	valueClassName?: string
}

function KpiCard({
	label,
	value,
	sub,
	isLoading,
	valueClassName,
}: KpiCardProps) {
	return (
		<div className="rounded-xl border border-border bg-card p-4 shadow-sm">
			<p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
				{label}
			</p>
			{isLoading ? (
				<>
					<Skeleton className="mb-1 h-8 w-16" />
					<Skeleton className="h-3 w-24" />
				</>
			) : (
				<>
					<p
						className={cn(
							"text-2xl font-semibold text-primary",
							valueClassName,
						)}
					>
						{value}
					</p>
					{sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
				</>
			)}
		</div>
	)
}

interface KpiCardsProps {
	thisMonth: number
	streak: number
	isHistoryLoading: boolean
}

export function KpiCards({
	thisMonth,
	streak,
	isHistoryLoading,
}: KpiCardsProps) {
	const { data: metrics, isLoading: isMetricsLoading } = useMetrics()

	const now = new Date()
	const monthLabel = now.toLocaleDateString("pt-BR", {
		month: "short",
		year: "numeric",
	})

	return (
		<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
			<KpiCard
				label="Total check-ins"
				value={metrics?.checkInsCount ?? 0}
				sub="Desde o início"
				isLoading={isMetricsLoading}
			/>
			<KpiCard
				label="Este mês"
				value={thisMonth}
				sub={monthLabel}
				isLoading={isHistoryLoading}
			/>
			<KpiCard
				label="Sequência atual"
				value={streak === 0 ? "—" : `${streak} dias`}
				sub="dias consecutivos"
				isLoading={isHistoryLoading}
			/>
			<KpiCard
				label="Status"
				value="Ativo"
				valueClassName="text-accent-foreground"
				isLoading={false}
			/>
		</div>
	)
}
