import type { Plan } from "@/features/subscriptions/api/use-plans"
import { PlanCardHero } from "./plan-card-hero"
import { PlanCardSecondary } from "./plan-card-secondary"

interface PlansSectionHeroProps {
	plans: ReadonlyArray<Plan>
}

function parsePriceLabelToCents(priceLabel: string): number {
	const match = priceLabel.match(/[\d.,]+/)
	if (!match) return 0
	const normalized = match[0].replace(/\./g, "").replace(",", ".")
	return Math.round(Number.parseFloat(normalized) * 100)
}

export function PlansSectionHero({ plans }: PlansSectionHeroProps) {
	// Destaque = maior preço da lista (ordenação desc), sem depender de um id
	// fixo como "premium-anual" — planos agora são cadastráveis pelo admin.
	const featuredPlan = [...plans].sort(
		(a, b) =>
			parsePriceLabelToCents(b.priceLabel) -
			parsePriceLabelToCents(a.priceLabel),
	)[0]
	if (!featuredPlan) return null
	const otherPlans = plans.filter((plan) => plan.id !== featuredPlan.id)
	return (
		<section
			aria-labelledby="plans-heading"
			className="mx-auto w-full max-w-xl"
		>
			<h2
				id="plans-heading"
				className="mb-2 font-display text-3xl tracking-tight text-foreground"
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
