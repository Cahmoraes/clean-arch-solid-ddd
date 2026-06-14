import Link from "next/link"
import type { DemoPlan } from "@/features/subscriptions/schemas"

interface PlanCardSecondaryProps {
	plan: DemoPlan
}

export function PlanCardSecondary({ plan }: PlanCardSecondaryProps) {
	return (
		<div
			data-testid={`plan-card-secondary-${plan.id}`}
			className="flex items-center justify-between gap-4 rounded-[14px] border border-border bg-card px-6 py-5"
		>
			<div className="min-w-0">
				<p className="font-display text-sm font-semibold text-foreground">
					{plan.name}
				</p>
				<p className="font-display text-xl font-bold text-foreground">
					{plan.priceLabel}
				</p>
				<p className="text-xs text-muted-foreground">{plan.tagline}</p>
			</div>
			<Link
				href="/cadastro"
				className="shrink-0 rounded-md border border-border px-5 py-2.5 font-display text-sm font-semibold text-foreground transition-colors hover:bg-surface-2"
			>
				Assinar
			</Link>
		</div>
	)
}
