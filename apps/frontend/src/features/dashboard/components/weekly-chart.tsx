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
}

function Bar({ count, dayIndex, heightPct }: BarProps) {
	return (
		<div className="flex flex-1 flex-col items-center gap-1">
			<div
				className="w-full rounded-t-sm"
				style={{
					height: `${Math.max(heightPct, 4)}%`,
					background:
						count > 0 ? "hsl(var(--foreground))" : "hsl(var(--muted))",
				}}
				title={`${DAY_LABELS[dayIndex]}: ${count} check-in${count !== 1 ? "s" : ""}`}
			/>
			<span className="text-xs text-muted-foreground">
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

	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
				Frequência semanal
			</p>
			<div
				role="img"
				aria-label="Gráfico de barras de frequência semanal"
				className="flex items-end gap-2"
				style={{ height: 80 }}
			>
				{frequency.map((count, dayIndex) => (
					<Bar
						// biome-ignore lint/suspicious/noArrayIndexKey: stable 7-item array
						key={dayIndex}
						count={count}
						dayIndex={dayIndex}
						heightPct={(count / max) * 100}
					/>
				))}
			</div>
		</div>
	)
}
