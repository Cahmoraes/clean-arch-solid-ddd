"use client"

import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { useMemo, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"

const AT_RISK_CRITICAL_THRESHOLD = 18

interface AtRiskMember {
	id: string
	name: string
	daysSinceLastCheckIn: number
}

interface AtRiskAlertZoneProps {
	members: AtRiskMember[]
	isLoading: boolean
}

function MemberRow({ member }: { member: AtRiskMember }) {
	const isCritical = member.daysSinceLastCheckIn >= AT_RISK_CRITICAL_THRESHOLD
	return (
		<li className="flex items-center gap-3 rounded-[6px] bg-surface-2 px-3 py-2">
			<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold uppercase">
				{member.name.slice(0, 2)}
			</div>
			<span className="text-sm font-medium">{member.name}</span>
			<span
				className={cn(
					"ml-auto text-xs font-semibold",
					isCritical ? "text-destructive" : "text-warning",
				)}
			>
				{member.daysSinceLastCheckIn} dias sem check-in
			</span>
		</li>
	)
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: handles loading, empty, and show-more states independently
export function AtRiskAlertZone({ members, isLoading }: AtRiskAlertZoneProps) {
	const [showAll, setShowAll] = useState(false)
	const sorted = useMemo(
		() =>
			[...members].sort(
				(a, b) => b.daysSinceLastCheckIn - a.daysSinceLastCheckIn,
			),
		[members],
	)

	if (isLoading) {
		return <Skeleton className="h-16 w-full rounded-[14px]" />
	}

	if (members.length === 0) {
		return (
			<div className="flex items-center gap-3 rounded-[14px] border border-success/25 bg-success-soft px-5 py-3">
				<CheckCircle2 className="size-4 shrink-0 text-primary" />
				<div>
					<p className="font-semibold text-primary">Academia saudável</p>
					<p className="text-xs text-muted-foreground">
						Nenhum membro em risco de churn nos últimos 30 dias
					</p>
				</div>
			</div>
		)
	}

	const visible = showAll ? sorted : sorted.slice(0, 3)
	const hasMore = members.length > 3

	return (
		<div className="rounded-[14px] border border-warning/25 bg-warning-soft px-5 py-4">
			<div className="flex items-center gap-2">
				<AlertTriangle className="size-4 shrink-0 text-warning" />
				<span className="font-bold text-warning">
					{members.length}{" "}
					{members.length === 1 ? "membro em risco" : "membros em risco"} de
					churn
				</span>
				{hasMore && (
					<button
						type="button"
						onClick={() => setShowAll((prev) => !prev)}
						className="ml-auto text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
					>
						{showAll ? "ver menos" : "ver todos"}
					</button>
				)}
			</div>
			<ul className="mt-3 space-y-2">
				{visible.map((member) => (
					<MemberRow key={member.id} member={member} />
				))}
			</ul>
		</div>
	)
}
