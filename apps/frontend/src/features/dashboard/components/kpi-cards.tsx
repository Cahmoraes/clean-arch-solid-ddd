"use client"

import {
	Activity,
	CalendarDays,
	CheckCircle,
	Flame,
	type LucideIcon,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/ui/stat-card"
import { useMetrics } from "@/features/profile/api"

function KpiSkeleton() {
	return (
		<div className="rounded-lg border border-border bg-card p-[22px] shadow-sm">
			<div className="mb-[18px] flex items-center justify-between">
				<Skeleton className="h-[42px] w-[42px] rounded-md" />
			</div>
			<Skeleton className="mb-2 h-[38px] w-20" />
			<Skeleton className="h-4 w-28" />
		</div>
	)
}

interface KpiSlotProps {
	icon: LucideIcon
	value: string
	label: string
	isLoading?: boolean
	highlight?: boolean
}

function KpiSlot({ icon, value, label, isLoading, highlight }: KpiSlotProps) {
	if (isLoading) {
		return <KpiSkeleton />
	}
	return (
		<StatCard icon={icon} value={value} label={label} highlight={highlight} />
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

	return (
		<>
			<KpiSlot
				icon={CheckCircle}
				value={String(metrics?.checkInsCount ?? 0)}
				label="Total check-ins"
				isLoading={isMetricsLoading}
				highlight
			/>
			<KpiSlot
				icon={CalendarDays}
				value={String(thisMonth)}
				label="Este mês"
				isLoading={isHistoryLoading}
			/>
			<KpiSlot
				icon={Flame}
				value={streak === 0 ? "—" : String(streak)}
				label="Sequência (dias)"
				isLoading={isHistoryLoading}
			/>
			<KpiSlot icon={Activity} value="Ativo" label="Status" />
		</>
	)
}
