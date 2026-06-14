import type { DemoPlan } from "@/features/subscriptions/schemas"
import { PlanCardHero } from "./plan-card-hero"
import { PlanCardSecondary } from "./plan-card-secondary"

interface PlansSectionHeroProps {
	plans: ReadonlyArray<DemoPlan>
}

export function PlansSectionHero({ plans }: PlansSectionHeroProps) {
	const featuredPlan = plans.find((p) => p.id === "premium-anual") ?? plans[0]
	if (!featuredPlan) return null
	const otherPlans = plans.filter((p) => p.id !== featuredPlan.id)
	return (
		<section
			aria-labelledby="plans-heading"
			className="mx-auto w-full max-w-xl"
		>
			<h2
				id="plans-heading"
				className="mb-2 font-display text-3xl font-bold tracking-tight text-foreground"
			>
				Escolha seu plano
			</h2>
			<p className="mb-8 text-base text-muted-foreground">
				Acesso a centenas de academias em todo o Brasil.
			</p>
			<div className="flex flex-col gap-4">
				<PlanCardHero plan={featuredPlan} />
				{otherPlans.map((plan) => (
					<PlanCardSecondary key={plan.id} plan={plan} />
				))}
			</div>
		</section>
	)
}
