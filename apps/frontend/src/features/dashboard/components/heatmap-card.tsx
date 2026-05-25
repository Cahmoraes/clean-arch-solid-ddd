// apps/frontend/src/features/dashboard/components/heatmap-card.tsx
import { Skeleton } from "@/components/ui/skeleton"
import type { HeatmapDay } from "@/features/dashboard/hooks/use-dashboard-metrics"
import { cn } from "@/lib/cn"

// Intensidade mapeada para opacidade do foreground
const INTENSITY_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
	0: "bg-muted",
	1: "bg-foreground/20",
	2: "bg-foreground/40",
	3: "bg-foreground/70",
	4: "bg-foreground",
}

interface HeatmapCellProps {
	day: HeatmapDay
}

function HeatmapCell({ day }: HeatmapCellProps) {
	const label =
		day.count === 0
			? `${day.date}: sem check-in`
			: `${day.date}: ${day.count} check-in${day.count > 1 ? "s" : ""}`

	return (
		<div
			title={label}
			className={cn(
				"aspect-square w-full rounded-sm",
				INTENSITY_CLASS[day.intensity],
			)}
		/>
	)
}

function HeatmapSkeleton() {
	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<Skeleton className="mb-3 h-4 w-48" />
			<div
				className="grid gap-1"
				style={{ gridTemplateColumns: "repeat(13, 1fr)" }}
			>
				{Array.from({ length: 91 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
					<Skeleton key={i} className="aspect-square w-full rounded-sm" />
				))}
			</div>
		</div>
	)
}

function buildWeeks(days: HeatmapDay[]): (HeatmapDay | null)[][] {
	const firstDay = days[0]
	const firstDayOfWeek = firstDay ? new Date(firstDay.date).getDay() : 0
	const paddedDays: (HeatmapDay | null)[] = [
		...Array.from({ length: firstDayOfWeek }, () => null),
		...days,
	]

	const weeks: (HeatmapDay | null)[][] = []
	for (let i = 0; i < paddedDays.length; i += 7) {
		weeks.push(paddedDays.slice(i, i + 7))
	}
	return weeks
}

interface WeekColumnProps {
	week: (HeatmapDay | null)[]
	weekIdx: number
}

function WeekColumn({ week, weekIdx }: WeekColumnProps) {
	return (
		<div key={weekIdx} className="flex flex-col gap-1">
			{week.map((day, dayIdx) =>
				day ? (
					<HeatmapCell key={day.date} day={day} />
				) : (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: padding cell
						key={`pad-${dayIdx}`}
						className="aspect-square w-3"
						aria-hidden="true"
					/>
				),
			)}
		</div>
	)
}

interface HeatmapCardProps {
	days: HeatmapDay[]
	isLoading?: boolean
}

export function HeatmapCard({ days, isLoading }: HeatmapCardProps) {
	if (isLoading) {
		return <HeatmapSkeleton />
	}

	const weeks = buildWeeks(days)

	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
				Atividade — últimos 3 meses
			</p>
			<div
				role="img"
				aria-label="Heatmap de atividade dos últimos 90 dias"
				className="flex gap-1"
			>
				{weeks.map((week, weekIdx) => (
					<WeekColumn
						// biome-ignore lint/suspicious/noArrayIndexKey: stable week index
						key={weekIdx}
						week={week}
						weekIdx={weekIdx}
					/>
				))}
			</div>
		</div>
	)
}
