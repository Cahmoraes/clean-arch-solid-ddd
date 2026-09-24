import Link from "next/link"
import type { Plan } from "@/features/subscriptions/api/use-plans"

interface PlanCardSecondaryProps {
	plan: Plan
}

export function PlanCardSecondary({ plan }: PlanCardSecondaryProps) {
	return (
		<div
			data-testid={`plan-card-secondary-${plan.id}`}
			className="flex items-center justify-between gap-4 rounded-md border border-border bg-card px-6 py-5"
		>
			<div className="min-w-0">
				<p className="font-display text-[15px] text-foreground">{plan.name}</p>
				<p className="font-display text-xl text-foreground">
					{plan.priceLabel}
				</p>
				<p className="text-xs text-muted-foreground">{plan.tagline}</p>
			</div>
			<Link
				href="/cadastro"
				className="shrink-0 rounded-md border border-border px-5 py-2.5 font-display text-[15px] text-foreground transition-colors hover:bg-surface-2"
			>
				Assinar
			</Link>
		</div>
	)
}
