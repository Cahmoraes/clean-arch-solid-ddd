import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import type { PlanAdmin } from "@/features/plans-admin/api"
import { resolvePlanStatusBadge } from "@/features/plans-admin/lib/resolve-plan-status-badge"
import { cn } from "@/lib/cn"

const BILLING_PERIOD_LABEL: Record<PlanAdmin["billingPeriod"], string> = {
	monthly: "mês",
	yearly: "ano",
}

function formatPriceLabel(plan: PlanAdmin): string {
	const amount = (plan.priceCents / 100).toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})
	return `R$ ${amount}/${BILLING_PERIOD_LABEL[plan.billingPeriod]}`
}

export interface PlanCardProps {
	plan: PlanAdmin
	onEdit: (plan: PlanAdmin) => void
	onToggleStatus: (plan: PlanAdmin) => void
}

export function PlanCard({ plan, onEdit, onToggleStatus }: PlanCardProps) {
	const badge = resolvePlanStatusBadge(plan)
	const toggleLabel = plan.isActive
		? `Inativar ${plan.name}`
		: `Reativar ${plan.name}`

	return (
		<article
			data-testid={`plan-card-${plan.id}`}
			className={cn(
				"flex flex-col gap-4 rounded-md border border-border bg-card p-6",
				!plan.isActive && "opacity-[0.55]",
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<h3 className="font-display text-lg text-foreground">{plan.name}</h3>
				<StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
			</div>
			<p className="font-sans text-2xl font-semibold tabular-nums text-foreground">
				{formatPriceLabel(plan)}
			</p>
			<p className="text-sm text-muted-foreground">{plan.tagline}</p>
			<ul className="flex flex-col gap-2">
				{plan.features.map((feature) => (
					<li
						key={feature}
						className="flex items-center gap-2 text-sm text-muted-foreground"
					>
						<Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
						{feature}
					</li>
				))}
			</ul>
			<div className="mt-auto flex items-center gap-2">
				<Button variant="outline" size="sm" onClick={() => onEdit(plan)}>
					Editar
				</Button>
				<Button
					variant={plan.isActive ? "destructive" : "primary"}
					size="sm"
					aria-label={toggleLabel}
					onClick={() => onToggleStatus(plan)}
				>
					{plan.isActive ? "Inativar" : "Reativar"}
				</Button>
			</div>
		</article>
	)
}
