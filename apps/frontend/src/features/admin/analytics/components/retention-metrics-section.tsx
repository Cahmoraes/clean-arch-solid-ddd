"use client"

import { AlertTriangle, ChevronDown } from "lucide-react"
import { useState } from "react"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { useRetentionMetrics } from "../api/use-retention-metrics"
import type { PeriodKey } from "../hooks/use-analytics-period"

interface RetentionMetricsSectionProps {
	period: PeriodKey
}

export function RetentionMetricsSection({
	period,
}: RetentionMetricsSectionProps) {
	const [isOpen, setIsOpen] = useState(false) // fechado por padrão (FR-013)
	const { data, isPending, isError } = useRetentionMetrics(period)

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card p-4 text-left font-semibold hover:bg-accent/50">
				<span>Retenção</span>
				<ChevronDown
					className="h-4 w-4 transition-transform duration-200"
					style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
				/>
			</CollapsibleTrigger>

			<CollapsibleContent className="mt-2 space-y-4">
				{isPending && (
					<div className="space-y-3">
						<div className="grid grid-cols-3 gap-4">
							<Skeleton className="h-20 rounded-lg" />
							<Skeleton className="h-20 rounded-lg" />
							<Skeleton className="h-20 rounded-lg" />
						</div>
						<Skeleton className="h-40 rounded-lg" />
					</div>
				)}

				{isError && (
					<p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
						Erro ao carregar dados de retenção.
					</p>
				)}

				{data && (
					<>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
							<div className="rounded-lg border bg-card p-4">
								<p className="text-2xl font-bold text-green-600 dark:text-green-400">
									{data.activeCount.toLocaleString("pt-BR")}
								</p>
								<p className="text-sm text-muted-foreground">Membros ativos</p>
								<p className="text-xs text-muted-foreground">
									(últimos 30 dias)
								</p>
							</div>

							<div className="rounded-lg border bg-card p-4">
								<p className="text-2xl font-bold text-red-600 dark:text-red-400">
									{data.inactiveCount.toLocaleString("pt-BR")}
								</p>
								<p className="text-sm text-muted-foreground">
									Membros inativos
								</p>
								<p className="text-xs text-muted-foreground">
									(sem check-in em 30+ dias)
								</p>
							</div>

							<div className="rounded-lg border bg-card p-4">
								<p className="text-2xl font-bold">
									{data.churnRate.toFixed(1)}%
								</p>
								<p className="text-sm text-muted-foreground">Taxa de churn</p>
							</div>
						</div>

						<div className="rounded-lg border bg-card p-4">
							<div className="mb-3 flex items-center gap-2">
								<AlertTriangle className="h-4 w-4 text-amber-500" />
								<h3 className="text-sm font-medium">
									Membros em risco ({data.atRiskMembers.length})
								</h3>
							</div>

							{data.atRiskMembers.length === 0 ? (
								<p className="text-center text-sm text-muted-foreground">
									Nenhum membro em risco no momento.
								</p>
							) : (
								<ul className="divide-y">
									{data.atRiskMembers.map((member) => (
										<li
											key={member.id}
											className="flex items-center justify-between py-2 text-sm"
										>
											<span className="font-medium">{member.name}</span>
											<span className="text-muted-foreground">
												{member.daysSinceLastCheckIn} dias sem check-in
											</span>
										</li>
									))}
								</ul>
							)}
						</div>
					</>
				)}
			</CollapsibleContent>
		</Collapsible>
	)
}
