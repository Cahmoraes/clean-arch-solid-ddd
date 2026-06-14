import Link from "next/link"

import { ContactSection } from "@/features/contact/components/contact-section"
import { PlansSectionHero } from "@/features/subscriptions/components/plans-section-hero"
import { DEMO_PLANS, type DemoPlan } from "@/features/subscriptions/schemas"
import { SERVER_API_URL } from "@/lib/server-api-url"

async function fetchPlans(): Promise<ReadonlyArray<DemoPlan>> {
	try {
		const res = await fetch(`${SERVER_API_URL}/plans`, {
			next: { revalidate: 3600 },
		})
		if (!res.ok) return DEMO_PLANS
		return (await res.json()) as ReadonlyArray<DemoPlan>
	} catch {
		return DEMO_PLANS
	}
}

/**
 * Landing pública — RSC. Apresenta o produto e direciona para
 * cadastro/login. Sem dependência do auth-store (cliente).
 */
export default async function LandingPage() {
	const plans = await fetchPlans()

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 py-16 sm:px-6 sm:py-24">
			<section
				aria-labelledby="hero-title"
				className="flex flex-col items-start gap-8"
			>
				<span className="rounded-full border border-border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
					Demo monocromática
				</span>
				<h1
					id="hero-title"
					className="font-display text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl"
				>
					Acesso a academias,
					<br />
					sem fricção.
				</h1>
				<p className="max-w-2xl text-lg text-muted-foreground">
					Encontre academias próximas, faça check-in e acompanhe sua frequência
					em uma interface despida do supérfluo. Inspirado em Ollama: puro,
					silencioso, focado.
				</p>
				<div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
					<Link
						href="/cadastro"
						data-testid="cta-signup"
						className="inline-flex items-center justify-center rounded-md border border-primary bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90"
					>
						Criar conta
					</Link>
					<Link
						href="/login"
						data-testid="cta-login"
						className="inline-flex items-center justify-center rounded-md border border-border bg-card px-6 py-3 text-base font-medium text-card-foreground hover:bg-accent hover:text-accent-foreground"
					>
						Entrar
					</Link>
				</div>
			</section>

			<section aria-labelledby="features-title" className="flex flex-col gap-8">
				<h2
					id="features-title"
					className="font-display text-3xl font-medium tracking-tight text-foreground"
				>
					Pensado para o essencial.
				</h2>
				<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<li className="rounded-[12px] border border-border bg-card p-6">
						<h3 className="font-display text-xl font-medium text-foreground">
							Check-in em segundos
						</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							Encontre a academia, confirme presença, siga seu treino.
						</p>
					</li>
					<li className="rounded-[12px] border border-border bg-card p-6">
						<h3 className="font-display text-xl font-medium text-foreground">
							Histórico transparente
						</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							Veja sua frequência, métricas e evolução em um único lugar.
						</p>
					</li>
					<li className="rounded-[12px] border border-border bg-card p-6">
						<h3 className="font-display text-xl font-medium text-foreground">
							Administração simples
						</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							Operadores validam check-ins e cadastram academias rapidamente.
						</p>
					</li>
				</ul>
			</section>

			<PlansSectionHero plans={plans} />

			<ContactSection />
		</div>
	)
}
