// apps/frontend/src/features/dashboard/components/weekly-chart.tsx
import { Skeleton } from "@/components/ui/skeleton"

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

const SKELETON_BAR_HEIGHTS = [60, 45, 75, 55, 80, 40, 65]

interface WeeklyChartProps {
	/**
	 * Array de 7 posições indexadas por dayOfWeek (0=Dom, 6=Sáb).
	 * Produzido por computeWeeklyFrequency() da Task 3.
	 */
	frequency: number[]
	isLoading?: boolean
}

function WeeklyChartSkeleton() {
	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<Skeleton className="mb-3 h-4 w-36" />
			<div className="flex items-end gap-2 pt-2" style={{ height: 80 }}>
				{SKELETON_BAR_HEIGHTS.map((height, i) => (
					<Skeleton
						// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
						key={i}
						className="flex-1 rounded-sm"
						style={{ height: `${height}%` }}
					/>
				))}
			</div>
		</div>
	)
}

interface BarProps {
	count: number
	dayIndex: number
	heightPct: number
	isCurrentDay: boolean
}

function Bar({ count, dayIndex, heightPct, isCurrentDay }: BarProps) {
	return (
		<div className="flex h-full flex-1 flex-col items-center gap-2.5">
			<div className="flex w-full flex-1 items-end">
				<div
					className="volt-bar w-full origin-bottom rounded-t-lg bg-surface-3 data-[current=true]:bg-accent"
					data-current={isCurrentDay}
					style={{ height: `${Math.max(heightPct, 4)}%` }}
					title={`${DAY_LABELS[dayIndex]}: ${count} check-in${count !== 1 ? "s" : ""}`}
				/>
			</div>
			<span className="text-xs font-medium text-subtle">
				{DAY_LABELS[dayIndex]}
			</span>
		</div>
	)
}

export function WeeklyChart({ frequency, isLoading }: WeeklyChartProps) {
	if (isLoading) {
		return <WeeklyChartSkeleton />
	}

	const max = Math.max(...frequency, 1)
	const currentDay = new Date().getDay()

	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
				Frequência semanal
			</p>
			<div
				role="img"
				aria-label="Gráfico de barras de frequência semanal"
				className="flex h-[140px] items-end gap-2.5 md:h-[200px]"
			>
				{frequency.map((count, dayIndex) => (
					<Bar
						// biome-ignore lint/suspicious/noArrayIndexKey: stable 7-item array
						key={dayIndex}
						count={count}
						dayIndex={dayIndex}
						heightPct={(count / max) * 100}
						isCurrentDay={dayIndex === currentDay}
					/>
				))}
			</div>
		</div>
	)
}
