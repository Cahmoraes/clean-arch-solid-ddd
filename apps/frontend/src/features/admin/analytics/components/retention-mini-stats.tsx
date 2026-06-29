import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"

interface RetentionMiniStatsProps {
	activeCount: number
	inactiveCount: number
	churnRate: number
	isLoading: boolean
}

interface StatPillProps {
	label: string
	value: string
	destructive?: boolean
}

function StatPill({ label, value, destructive = false }: StatPillProps) {
	return (
		<div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5">
			<span className="text-xs text-muted-foreground">{label}</span>
			<span
				className={cn(
					"font-mono text-sm font-bold",
					destructive && "text-destructive",
				)}
			>
				{value}
			</span>
		</div>
	)
}

export function RetentionMiniStats({
	activeCount,
	inactiveCount,
	churnRate,
	isLoading,
}: RetentionMiniStatsProps) {
	if (isLoading) {
		return (
			<div className="grid grid-cols-3 gap-2.5">
				<Skeleton className="h-11 w-full rounded-lg" data-testid="skeleton" />
				<Skeleton className="h-11 w-full rounded-lg" data-testid="skeleton" />
				<Skeleton className="h-11 w-full rounded-lg" data-testid="skeleton" />
			</div>
		)
	}

	return (
		<div className="grid grid-cols-3 gap-2.5">
			<StatPill
				label="Membros ativos"
				value={activeCount.toLocaleString("pt-BR")}
			/>
			<StatPill
				label="Inativos"
				value={inactiveCount.toLocaleString("pt-BR")}
				destructive
			/>
			<StatPill
				label="Taxa de churn"
				value={`${churnRate.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
				destructive
			/>
		</div>
	)
}
