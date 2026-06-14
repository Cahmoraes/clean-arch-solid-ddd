import { Check } from "lucide-react"
import Link from "next/link"
import type { DemoPlan } from "@/features/subscriptions/schemas"

interface PlanCardHeroProps {
	plan: DemoPlan
	badgeLabel?: string
}

export function PlanCardHero({
	plan,
	badgeLabel = "Melhor valor",
}: PlanCardHeroProps) {
	return (
		<div
			data-testid={`plan-card-hero-${plan.id}`}
			className="relative overflow-hidden rounded-[22px] border border-accent/20 bg-card p-8 sm:p-10"
		>
			<div
				aria-hidden
				className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-2xl"
			/>
			<span className="mb-4 inline-block rounded-full bg-accent px-3 py-1 font-display text-xs font-black uppercase tracking-widest text-accent-foreground">
				{badgeLabel}
			</span>
			<h3 className="mb-1 font-display text-xl font-bold text-foreground">
				{plan.name}
			</h3>
			<p className="mb-1 font-display text-3xl font-bold text-foreground">
				{plan.priceLabel}
			</p>
			<p className="mb-6 text-sm text-muted-foreground">{plan.tagline}</p>
			<ul className="mb-8 flex flex-col gap-3" aria-label="Benefícios do plano">
				{plan.features.map((feature) => (
					<li
						key={feature}
						className="flex items-center gap-2.5 text-sm text-muted-foreground"
					>
						<span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/20">
							<Check className="h-3 w-3 text-success" aria-hidden />
						</span>
						{feature}
					</li>
				))}
			</ul>
			<Link
				href="/cadastro"
				className="block w-full rounded-md bg-accent py-3 text-center font-display text-sm font-bold text-accent-foreground transition-colors hover:bg-primary-strong"
			>
				Assinar agora
			</Link>
		</div>
	)
}
